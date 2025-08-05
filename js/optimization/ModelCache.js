/**
 * @fileoverview Sistema de cache inteligente para modelos 3D com políticas LRU
 */

/**
 * Classe responsável pelo cache inteligente de modelos 3D
 * Implementa políticas LRU (Least Recently Used) e gerenciamento automático de memória
 */
class ModelCache {
    constructor(config = {}) {
        this.config = {
            maxSize: 100 * 1024 * 1024, // 100MB padrão
            maxEntries: 50, // Máximo de entradas no cache
            memoryThreshold: 0.8, // 80% da capacidade máxima
            cleanupInterval: 30000, // Limpeza automática a cada 30s
            ...config
        };

        // Armazenamento do cache
        this.cache = new Map();
        this.usage = new Map();
        this.accessOrder = [];
        
        // Métricas do cache
        this.currentSize = 0;
        this.totalRequests = 0;
        this.cacheHits = 0;
        this.cacheMisses = 0;
        
        // Timer para limpeza automática
        this.cleanupTimer = null;
        
        // Callbacks para eventos
        this.callbacks = {
            eviction: new Set(),
            load: new Set(),
            error: new Set()
        };

        this.startCleanupTimer();
        
        console.log('ModelCache inicializado:', {
            maxSize: `${(this.config.maxSize / 1024 / 1024).toFixed(1)}MB`,
            maxEntries: this.config.maxEntries
        });
    }

    /**
     * Obtém um modelo do cache ou carrega se necessário
     * @param {string} key - Chave única do modelo
     * @param {Function} loader - Função para carregar o modelo se não estiver em cache
     * @param {Object} options - Opções adicionais
     * @returns {Promise<Object>} Modelo carregado
     */
    async get(key, loader, options = {}) {
        this.totalRequests++;
        
        // Verificar se está no cache
        if (this.cache.has(key)) {
            this.cacheHits++;
            this.updateAccess(key);
            
            const entry = this.cache.get(key);
            console.log(`Cache HIT para ${key} (${this.formatSize(entry.size)})`);
            
            return entry.model;
        }
        
        // Cache miss - carregar modelo
        this.cacheMisses++;
        console.log(`Cache MISS para ${key} - carregando...`);
        
        try {
            const startTime = performance.now();
            const model = await loader();
            const loadTime = performance.now() - startTime;
            
            // Adicionar ao cache
            await this.set(key, model, {
                quality: options.quality || 'unknown',
                loadTime,
                ...options
            });
            
            // Notificar callbacks de carregamento
            this.notifyCallbacks('load', { key, model, loadTime });
            
            return model;
            
        } catch (error) {
            console.error(`Erro ao carregar modelo ${key}:`, error);
            this.notifyCallbacks('error', { key, error });
            throw error;
        }
    }

    /**
     * Adiciona um modelo ao cache
     * @param {string} key - Chave única do modelo
     * @param {Object} model - Modelo 3D
     * @param {Object} metadata - Metadados do modelo
     */
    async set(key, model, metadata = {}) {
        const size = this.estimateModelSize(model);
        
        // Verificar se o modelo é muito grande para o cache
        if (size > this.config.maxSize * 0.5) {
            console.warn(`Modelo ${key} muito grande para cache (${this.formatSize(size)})`);
            return;
        }
        
        // Limpar espaço se necessário
        await this.ensureSpace(size);
        
        // Criar entrada do cache
        const entry = {
            model,
            size,
            lastAccess: Date.now(),
            accessCount: 1,
            quality: metadata.quality || 'unknown',
            loadTime: metadata.loadTime || 0,
            metadata: { ...metadata }
        };
        
        // Adicionar ao cache
        this.cache.set(key, entry);
        this.usage.set(key, entry);
        this.currentSize += size;
        this.updateAccessOrder(key);
        
        console.log(`Modelo ${key} adicionado ao cache:`, {
            size: this.formatSize(size),
            quality: entry.quality,
            totalSize: this.formatSize(this.currentSize),
            entries: this.cache.size
        });
    }

    /**
     * Estima o tamanho de um modelo 3D em bytes
     * @private
     * @param {Object} model - Modelo 3D (Three.js Object3D)
     * @returns {number} Tamanho estimado em bytes
     */
    estimateModelSize(model) {
        let totalSize = 0;
        
        try {
            // Percorrer hierarquia do modelo
            model.traverse((child) => {
                // Estimar geometria
                if (child.geometry) {
                    const geometry = child.geometry;
                    
                    // Vértices
                    if (geometry.attributes.position) {
                        totalSize += geometry.attributes.position.count * 3 * 4; // 3 floats por vértice
                    }
                    
                    // Normais
                    if (geometry.attributes.normal) {
                        totalSize += geometry.attributes.normal.count * 3 * 4;
                    }
                    
                    // UVs
                    if (geometry.attributes.uv) {
                        totalSize += geometry.attributes.uv.count * 2 * 4; // 2 floats por UV
                    }
                    
                    // Índices
                    if (geometry.index) {
                        totalSize += geometry.index.count * 2; // 2 bytes por índice (assumindo Uint16)
                    }
                }
                
                // Estimar materiais e texturas
                if (child.material) {
                    const materials = Array.isArray(child.material) ? child.material : [child.material];
                    
                    materials.forEach(material => {
                        // Estimar texturas
                        Object.values(material).forEach(value => {
                            if (value && value.isTexture) {
                                // Estimativa baseada na resolução da textura
                                const width = value.image?.width || 512;
                                const height = value.image?.height || 512;
                                const channels = 4; // RGBA
                                totalSize += width * height * channels;
                            }
                        });
                    });
                }
            });
            
            // Adicionar overhead estimado (metadados, estruturas, etc.)
            totalSize *= 1.2;
            
        } catch (error) {
            console.warn('Erro ao estimar tamanho do modelo:', error);
            // Fallback: estimativa baseada no tipo de modelo
            totalSize = 5 * 1024 * 1024; // 5MB padrão
        }
        
        return Math.round(totalSize);
    }

    /**
     * Garante que há espaço suficiente no cache
     * @private
     * @param {number} requiredSize - Tamanho necessário em bytes
     */
    async ensureSpace(requiredSize) {
        // Verificar se precisa limpar espaço
        while (
            (this.currentSize + requiredSize > this.config.maxSize) ||
            (this.cache.size >= this.config.maxEntries)
        ) {
            if (this.accessOrder.length === 0) {
                console.warn('Cache vazio mas sem espaço - resetando');
                this.clear();
                break;
            }
            
            await this.evictLeastUsed();
        }
    }

    /**
     * Remove o item menos usado do cache
     * @private
     */
    async evictLeastUsed() {
        if (this.accessOrder.length === 0) return;
        
        // Encontrar o item menos usado (primeiro na lista de acesso)
        const keyToEvict = this.accessOrder[0];
        const entry = this.cache.get(keyToEvict);
        
        if (entry) {
            console.log(`Removendo do cache: ${keyToEvict} (${this.formatSize(entry.size)})`);
            
            // Notificar callbacks de remoção
            this.notifyCallbacks('eviction', { 
                key: keyToEvict, 
                entry: { ...entry },
                reason: 'lru'
            });
            
            // Remover do cache
            this.cache.delete(keyToEvict);
            this.usage.delete(keyToEvict);
            this.currentSize -= entry.size;
            
            // Remover da ordem de acesso
            const index = this.accessOrder.indexOf(keyToEvict);
            if (index > -1) {
                this.accessOrder.splice(index, 1);
            }
        }
    }

    /**
     * Atualiza o registro de acesso de um item
     * @private
     * @param {string} key - Chave do item
     */
    updateAccess(key) {
        const entry = this.usage.get(key);
        if (entry) {
            entry.lastAccess = Date.now();
            entry.accessCount++;
        }
        
        this.updateAccessOrder(key);
    }

    /**
     * Atualiza a ordem de acesso (move para o final)
     * @private
     * @param {string} key - Chave do item
     */
    updateAccessOrder(key) {
        // Remover da posição atual
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        
        // Adicionar no final (mais recentemente usado)
        this.accessOrder.push(key);
    }

    /**
     * Verifica se um modelo está no cache
     * @param {string} key - Chave do modelo
     * @returns {boolean} True se estiver no cache
     */
    has(key) {
        return this.cache.has(key);
    }

    /**
     * Remove um modelo específico do cache
     * @param {string} key - Chave do modelo
     * @returns {boolean} True se foi removido
     */
    delete(key) {
        const entry = this.cache.get(key);
        if (!entry) return false;
        
        console.log(`Removendo manualmente do cache: ${key}`);
        
        this.cache.delete(key);
        this.usage.delete(key);
        this.currentSize -= entry.size;
        
        const index = this.accessOrder.indexOf(key);
        if (index > -1) {
            this.accessOrder.splice(index, 1);
        }
        
        this.notifyCallbacks('eviction', { 
            key, 
            entry: { ...entry },
            reason: 'manual'
        });
        
        return true;
    }

    /**
     * Limpa todo o cache
     */
    clear() {
        const entriesCleared = this.cache.size;
        const sizeCleared = this.currentSize;
        
        this.cache.clear();
        this.usage.clear();
        this.accessOrder = [];
        this.currentSize = 0;
        
        console.log(`Cache limpo: ${entriesCleared} entradas, ${this.formatSize(sizeCleared)}`);
    }

    /**
     * Inicia o timer de limpeza automática
     * @private
     */
    startCleanupTimer() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        
        this.cleanupTimer = setInterval(() => {
            this.performMaintenance();
        }, this.config.cleanupInterval);
    }

    /**
     * Executa manutenção automática do cache
     * @private
     */
    performMaintenance() {
        const now = Date.now();
        const maxAge = 5 * 60 * 1000; // 5 minutos
        
        // Remover itens muito antigos
        const keysToRemove = [];
        
        this.usage.forEach((entry, key) => {
            if (now - entry.lastAccess > maxAge && entry.accessCount === 1) {
                keysToRemove.push(key);
            }
        });
        
        keysToRemove.forEach(key => {
            console.log(`Removendo item antigo do cache: ${key}`);
            this.delete(key);
        });
        
        // Verificar se está próximo do limite de memória
        if (this.currentSize > this.config.maxSize * this.config.memoryThreshold) {
            console.log('Cache próximo do limite - executando limpeza preventiva');
            this.evictLeastUsed();
        }
    }

    /**
     * Obtém estatísticas do cache
     * @returns {Object} Estatísticas detalhadas
     */
    getStats() {
        const hitRate = this.totalRequests > 0 ? 
            (this.cacheHits / this.totalRequests) * 100 : 0;
        
        return {
            size: {
                current: this.currentSize,
                max: this.config.maxSize,
                percentage: (this.currentSize / this.config.maxSize) * 100,
                formatted: this.formatSize(this.currentSize)
            },
            entries: {
                current: this.cache.size,
                max: this.config.maxEntries
            },
            performance: {
                totalRequests: this.totalRequests,
                cacheHits: this.cacheHits,
                cacheMisses: this.cacheMisses,
                hitRate: Math.round(hitRate * 100) / 100
            },
            mostUsed: this.getMostUsedEntries(5),
            leastUsed: this.getLeastUsedEntries(5)
        };
    }

    /**
     * Obtém as entradas mais usadas
     * @private
     * @param {number} count - Número de entradas
     * @returns {Array} Lista de entradas mais usadas
     */
    getMostUsedEntries(count) {
        return Array.from(this.usage.entries())
            .sort((a, b) => b[1].accessCount - a[1].accessCount)
            .slice(0, count)
            .map(([key, entry]) => ({
                key,
                accessCount: entry.accessCount,
                size: this.formatSize(entry.size),
                quality: entry.quality
            }));
    }

    /**
     * Obtém as entradas menos usadas
     * @private
     * @param {number} count - Número de entradas
     * @returns {Array} Lista de entradas menos usadas
     */
    getLeastUsedEntries(count) {
        return Array.from(this.usage.entries())
            .sort((a, b) => a[1].accessCount - b[1].accessCount)
            .slice(0, count)
            .map(([key, entry]) => ({
                key,
                accessCount: entry.accessCount,
                lastAccess: new Date(entry.lastAccess).toLocaleString(),
                size: this.formatSize(entry.size)
            }));
    }

    /**
     * Registra callback para eventos do cache
     * @param {string} event - Tipo de evento ('eviction', 'load', 'error')
     * @param {Function} callback - Função callback
     */
    on(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].add(callback);
        }
    }

    /**
     * Remove callback de eventos
     * @param {string} event - Tipo de evento
     * @param {Function} callback - Função callback
     */
    off(event, callback) {
        if (this.callbacks[event]) {
            this.callbacks[event].delete(callback);
        }
    }

    /**
     * Notifica callbacks de eventos
     * @private
     * @param {string} event - Tipo de evento
     * @param {Object} data - Dados do evento
     */
    notifyCallbacks(event, data) {
        if (this.callbacks[event]) {
            this.callbacks[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Erro em callback de ${event}:`, error);
                }
            });
        }
    }

    /**
     * Formata tamanho em bytes para string legível
     * @private
     * @param {number} bytes - Tamanho em bytes
     * @returns {string} Tamanho formatado
     */
    formatSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
    }

    /**
     * Destrói o cache e limpa recursos
     */
    destroy() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
        }
        
        this.clear();
        this.callbacks.eviction.clear();
        this.callbacks.load.clear();
        this.callbacks.error.clear();
        
        console.log('ModelCache destruído');
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.ModelCache = ModelCache;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModelCache;
}