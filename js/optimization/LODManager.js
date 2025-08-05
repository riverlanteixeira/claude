/**
 * @fileoverview Gerenciador principal do sistema Level of Detail (LOD) para modelos 3D
 */

/**
 * Classe principal responsável pelo gerenciamento de Level of Detail (LOD)
 * Coordena cache, performance e otimização automática de modelos 3D
 */
class LODManager {
    constructor(config = {}) {
        this.config = {
            distances: { near: 3, medium: 8, far: 15 },
            qualityLevels: ['low', 'medium', 'high'],
            transitionSpeed: 0.5,
            memoryThreshold: 0.8,
            targetFPS: 30,
            autoOptimize: true,
            maxActiveModels: 10,
            preloadDistance: 20,
            ...config
        };

        // Componentes do sistema
        this.modelCache = new ModelCache({
            maxSize: config.cacheSize || 100 * 1024 * 1024,
            maxEntries: config.maxCacheEntries || 50
        });
        
        this.performanceMonitor = new PerformanceMonitor({
            targetFPS: this.config.targetFPS
        });
        
        this.deviceDetector = new DeviceDetector();
        
        // Estado do sistema
        this.activeModels = new Map();
        this.loadingQueue = new Map();
        this.isInitialized = false;
        this.isOptimizing = false;
        
        // Métricas
        this.stats = {
            modelsRegistered: 0,
            qualityChanges: 0,
            cacheHits: 0,
            cacheMisses: 0,
            optimizationRuns: 0
        };
        
        // Callbacks
        this.callbacks = {
            qualityChange: new Set(),
            modelLoad: new Set(),
            optimizationStart: new Set(),
            optimizationEnd: new Set()
        };

        console.log('LODManager criado com configuração:', this.config);
    }

    /**
     * Inicializa o sistema LOD
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('LODManager já foi inicializado');
            return;
        }

        console.log('Inicializando LODManager...');

        try {
            // Detectar capacidades do dispositivo
            const capabilities = await this.deviceDetector.initialize();
            console.log('Capacidades do dispositivo:', capabilities);
            
            // Ajustar configurações baseado no dispositivo
            this.adjustConfigForDevice(capabilities);
            
            // Iniciar monitoramento de performance
            this.performanceMonitor.startMonitoring();
            
            // Configurar callbacks de performance
            this.performanceMonitor.onPerformanceIssue((notification) => {
                this.handlePerformanceIssue(notification);
            });
            
            // Configurar callbacks do cache
            this.modelCache.on('eviction', (data) => {
                console.log(`Modelo removido do cache: ${data.key}`);
            });
            
            this.isInitialized = true;
            console.log('LODManager inicializado com sucesso');
            
        } catch (error) {
            console.error('Erro ao inicializar LODManager:', error);
            throw error;
        }
    }

    /**
     * Ajusta configurações baseado nas capacidades do dispositivo
     * @private
     * @param {DeviceCapabilities} capabilities - Capacidades detectadas
     */
    adjustConfigForDevice(capabilities) {
        const settings = capabilities.recommendedSettings;
        
        // Ajustar distâncias LOD
        this.config.distances = {
            near: settings.lodDistances[0],
            medium: settings.lodDistances[1],
            far: settings.lodDistances[2]
        };
        
        // Ajustar FPS alvo
        this.config.targetFPS = settings.targetFPS;
        
        // Ajustar número máximo de modelos ativos
        this.config.maxActiveModels = settings.maxModels;
        
        // Reconfigurar cache
        this.modelCache.config.maxSize = settings.cacheSize;
        
        console.log('Configurações ajustadas para dispositivo:', {
            tier: capabilities.tier,
            distances: this.config.distances,
            targetFPS: this.config.targetFPS,
            maxModels: this.config.maxActiveModels,
            cacheSize: `${(settings.cacheSize / 1024 / 1024).toFixed(1)}MB`
        });
    }

    /**
     * Registra um modelo no sistema LOD
     * @param {string} entityId - ID único da entidade
     * @param {ModelPaths} modelPaths - Caminhos para diferentes qualidades
     * @param {Object} options - Opções adicionais
     * @returns {Promise<void>}
     */
    async registerModel(entityId, modelPaths, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        const modelConfig = {
            entityId,
            paths: modelPaths,
            lodDistances: options.lodDistances || this.config.distances,
            currentQuality: null,
            isLoaded: false,
            isVisible: false,
            lastUpdate: 0,
            memoryUsage: 0,
            priority: options.priority || 5,
            preload: options.preload !== false,
            element: options.element || document.getElementById(entityId)
        };

        this.activeModels.set(entityId, modelConfig);
        this.stats.modelsRegistered++;

        console.log(`Modelo registrado: ${entityId}`, {
            paths: Object.keys(modelPaths),
            priority: modelConfig.priority,
            preload: modelConfig.preload
        });

        // Pré-carregar modelo de baixa qualidade se solicitado
        if (modelConfig.preload && modelPaths.low) {
            try {
                await this.preloadModel(entityId, 'low');
            } catch (error) {
                console.warn(`Erro no pré-carregamento de ${entityId}:`, error);
            }
        }

        // Notificar callbacks
        this.notifyCallbacks('modelLoad', { entityId, config: modelConfig });
    }

    /**
     * Pré-carrega um modelo em qualidade específica
     * @private
     * @param {string} entityId - ID da entidade
     * @param {string} quality - Qualidade a ser carregada
     * @returns {Promise<Object>} Modelo carregado
     */
    async preloadModel(entityId, quality) {
        const config = this.activeModels.get(entityId);
        if (!config || !config.paths[quality]) {
            throw new Error(`Modelo ou qualidade não encontrada: ${entityId}/${quality}`);
        }

        const cacheKey = `${entityId}_${quality}`;
        
        return await this.modelCache.get(cacheKey, async () => {
            console.log(`Carregando modelo: ${entityId} (${quality})`);
            
            // Simular carregamento do modelo (substituir por loader real)
            const loader = new THREE.GLTFLoader();
            return new Promise((resolve, reject) => {
                loader.load(
                    config.paths[quality],
                    (gltf) => {
                        console.log(`Modelo carregado: ${entityId} (${quality})`);
                        resolve(gltf.scene);
                    },
                    (progress) => {
                        // Callback de progresso opcional
                    },
                    (error) => {
                        console.error(`Erro ao carregar ${entityId}:`, error);
                        reject(error);
                    }
                );
            });
        }, { quality });
    }

    /**
     * Atualiza o LOD de um modelo baseado na posição da câmera
     * @param {string} entityId - ID da entidade
     * @param {Object} cameraData - Dados da câmera (posição, distância)
     * @returns {Promise<void>}
     */
    async updateModelLOD(entityId, cameraData) {
        const config = this.activeModels.get(entityId);
        if (!config) {
            console.warn(`Modelo não registrado: ${entityId}`);
            return;
        }

        const distance = cameraData.distance || this.calculateDistance(
            cameraData.position, 
            config.element?.object3D?.position
        );

        // Determinar qualidade apropriada baseada na distância
        const targetQuality = this.determineQuality(distance, config.lodDistances);
        
        // Verificar se precisa trocar qualidade
        if (targetQuality !== config.currentQuality) {
            await this.changeModelQuality(entityId, targetQuality);
        }

        // Atualizar estado
        config.lastUpdate = Date.now();
        config.isVisible = this.isModelVisible(config.element, cameraData);
        
        // Otimização automática se habilitada
        if (this.config.autoOptimize && !this.isOptimizing) {
            this.scheduleOptimization();
        }
    }

    /**
     * Determina a qualidade apropriada baseada na distância
     * @private
     * @param {number} distance - Distância da câmera
     * @param {LODDistances} lodDistances - Configurações de distância
     * @returns {string} Qualidade apropriada
     */
    determineQuality(distance, lodDistances) {
        if (distance <= lodDistances.near) {
            return 'high';
        } else if (distance <= lodDistances.medium) {
            return 'medium';
        } else {
            return 'low';
        }
    }

    /**
     * Muda a qualidade de um modelo
     * @private
     * @param {string} entityId - ID da entidade
     * @param {string} targetQuality - Qualidade desejada
     * @returns {Promise<void>}
     */
    async changeModelQuality(entityId, targetQuality) {
        const config = this.activeModels.get(entityId);
        if (!config || !config.paths[targetQuality]) {
            return;
        }

        const previousQuality = config.currentQuality;
        
        try {
            // Carregar novo modelo
            const model = await this.preloadModel(entityId, targetQuality);
            
            // Aplicar modelo ao elemento A-Frame
            if (config.element) {
                this.applyModelToElement(config.element, model, targetQuality);
            }
            
            // Atualizar configuração
            config.currentQuality = targetQuality;
            config.isLoaded = true;
            this.stats.qualityChanges++;
            
            console.log(`Qualidade alterada: ${entityId} ${previousQuality} → ${targetQuality}`);
            
            // Notificar callbacks
            this.notifyCallbacks('qualityChange', {
                entityId,
                previousQuality,
                newQuality: targetQuality,
                model
            });
            
        } catch (error) {
            console.error(`Erro ao alterar qualidade de ${entityId}:`, error);
            
            // Tentar fallback para qualidade inferior
            if (targetQuality === 'high') {
                await this.changeModelQuality(entityId, 'medium');
            } else if (targetQuality === 'medium') {
                await this.changeModelQuality(entityId, 'low');
            }
        }
    }

    /**
     * Aplica um modelo carregado a um elemento A-Frame
     * @private
     * @param {Element} element - Elemento A-Frame
     * @param {Object} model - Modelo 3D carregado
     * @param {string} quality - Qualidade do modelo
     */
    applyModelToElement(element, model, quality) {
        try {
            // Remover modelo anterior se existir
            const existingModel = element.getObject3D('mesh');
            if (existingModel) {
                element.removeObject3D('mesh');
            }
            
            // Clonar modelo para evitar problemas de referência
            const clonedModel = model.clone();
            
            // Aplicar escala baseada na qualidade (opcional)
            const scaleFactors = { low: 0.8, medium: 0.9, high: 1.0 };
            const scale = scaleFactors[quality] || 1.0;
            clonedModel.scale.setScalar(scale);
            
            // Adicionar ao elemento
            element.setObject3D('mesh', clonedModel);
            
            // Marcar como visível
            element.setAttribute('visible', true);
            
        } catch (error) {
            console.error('Erro ao aplicar modelo ao elemento:', error);
        }
    }

    /**
     * Calcula distância entre dois pontos 3D
     * @private
     * @param {Object} pos1 - Primeira posição
     * @param {Object} pos2 - Segunda posição
     * @returns {number} Distância em metros
     */
    calculateDistance(pos1, pos2) {
        if (!pos1 || !pos2) return Infinity;
        
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const dz = pos1.z - pos2.z;
        
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    /**
     * Verifica se um modelo está visível
     * @private
     * @param {Element} element - Elemento do modelo
     * @param {Object} cameraData - Dados da câmera
     * @returns {boolean} True se visível
     */
    isModelVisible(element, cameraData) {
        if (!element || !element.object3D) return false;
        
        // Verificação básica de visibilidade
        const visible = element.getAttribute('visible');
        if (visible === false) return false;
        
        // TODO: Implementar frustum culling mais sofisticado
        // Por enquanto, assumir que está visível se está carregado
        return true;
    }

    /**
     * Agenda otimização automática
     * @private
     */
    scheduleOptimization() {
        // Debounce para evitar otimizações muito frequentes
        if (this.optimizationTimeout) {
            clearTimeout(this.optimizationTimeout);
        }
        
        this.optimizationTimeout = setTimeout(() => {
            this.optimizeForPerformance();
        }, 1000); // Aguardar 1 segundo
    }

    /**
     * Otimiza o sistema para melhor performance
     * @param {number} targetFPS - FPS alvo (opcional)
     * @returns {Promise<void>}
     */
    async optimizeForPerformance(targetFPS = null) {
        if (this.isOptimizing) return;
        
        this.isOptimizing = true;
        this.stats.optimizationRuns++;
        
        const target = targetFPS || this.config.targetFPS;
        const currentMetrics = this.performanceMonitor.getCurrentMetrics();
        
        console.log('Iniciando otimização de performance:', {
            currentFPS: currentMetrics.fps,
            targetFPS: target,
            memoryUsage: `${currentMetrics.memoryUsage.percentage}%`
        });
        
        this.notifyCallbacks('optimizationStart', { currentMetrics, target });
        
        try {
            // Estratégias de otimização baseadas na performance atual
            if (currentMetrics.fps < target * 0.8) {
                await this.applyPerformanceOptimizations(currentMetrics);
            }
            
            // Limpeza de memória se necessário
            if (currentMetrics.memoryUsage.percentage > 80) {
                await this.performMemoryCleanup();
            }
            
            console.log('Otimização concluída');
            
        } catch (error) {
            console.error('Erro durante otimização:', error);
        } finally {
            this.isOptimizing = false;
            this.notifyCallbacks('optimizationEnd', { 
                finalMetrics: this.performanceMonitor.getCurrentMetrics() 
            });
        }
    }

    /**
     * Aplica otimizações de performance
     * @private
     * @param {PerformanceMetrics} metrics - Métricas atuais
     */
    async applyPerformanceOptimizations(metrics) {
        const activeModels = Array.from(this.activeModels.values())
            .filter(config => config.isVisible && config.isLoaded);
        
        // Reduzir qualidade de modelos distantes
        for (const config of activeModels) {
            if (config.currentQuality === 'high') {
                console.log(`Reduzindo qualidade de ${config.entityId} para otimização`);
                await this.changeModelQuality(config.entityId, 'medium');
            } else if (config.currentQuality === 'medium') {
                await this.changeModelQuality(config.entityId, 'low');
            }
        }
        
        // Descarregar modelos não visíveis há muito tempo
        const now = Date.now();
        const maxIdleTime = 30000; // 30 segundos
        
        for (const [entityId, config] of this.activeModels) {
            if (!config.isVisible && (now - config.lastUpdate) > maxIdleTime) {
                console.log(`Descarregando modelo inativo: ${entityId}`);
                this.unloadModel(entityId);
            }
        }
    }

    /**
     * Executa limpeza de memória
     * @private
     */
    async performMemoryCleanup() {
        console.log('Executando limpeza de memória...');
        
        // Limpar cache de modelos menos usados
        const cacheStats = this.modelCache.getStats();
        const leastUsed = cacheStats.leastUsed;
        
        // Remover 25% dos itens menos usados
        const itemsToRemove = Math.ceil(leastUsed.length * 0.25);
        
        for (let i = 0; i < itemsToRemove && i < leastUsed.length; i++) {
            this.modelCache.delete(leastUsed[i].key);
        }
        
        // Forçar garbage collection se disponível
        if (window.gc) {
            window.gc();
        }
    }

    /**
     * Descarrega um modelo da memória
     * @param {string} entityId - ID da entidade
     */
    unloadModel(entityId) {
        const config = this.activeModels.get(entityId);
        if (!config) return;
        
        // Remover modelo do elemento
        if (config.element) {
            const existingModel = config.element.getObject3D('mesh');
            if (existingModel) {
                config.element.removeObject3D('mesh');
            }
            config.element.setAttribute('visible', false);
        }
        
        // Atualizar estado
        config.isLoaded = false;
        config.currentQuality = null;
        
        console.log(`Modelo descarregado: ${entityId}`);
    }

    /**
     * Trata problemas de performance detectados
     * @private
     * @param {Object} notification - Notificação de problema
     */
    handlePerformanceIssue(notification) {
        console.log('Problema de performance detectado:', notification);
        
        // Aplicar recomendações automaticamente
        notification.recommendations.forEach(recommendation => {
            switch (recommendation) {
                case 'reduce_model_quality':
                    this.reduceAllModelQuality();
                    break;
                case 'clear_cache':
                    this.modelCache.clear();
                    break;
                case 'reduce_active_models':
                    this.reduceActiveModels();
                    break;
            }
        });
    }

    /**
     * Reduz a qualidade de todos os modelos ativos
     * @private
     */
    async reduceAllModelQuality() {
        for (const [entityId, config] of this.activeModels) {
            if (config.currentQuality === 'high') {
                await this.changeModelQuality(entityId, 'medium');
            } else if (config.currentQuality === 'medium') {
                await this.changeModelQuality(entityId, 'low');
            }
        }
    }

    /**
     * Reduz o número de modelos ativos
     * @private
     */
    reduceActiveModels() {
        const activeModels = Array.from(this.activeModels.entries())
            .filter(([_, config]) => config.isLoaded)
            .sort((a, b) => a[1].priority - b[1].priority); // Ordenar por prioridade
        
        // Descarregar modelos de menor prioridade
        const toUnload = Math.ceil(activeModels.length * 0.3); // 30%
        
        for (let i = 0; i < toUnload; i++) {
            const [entityId] = activeModels[i];
            this.unloadModel(entityId);
        }
    }

    /**
     * Registra callback para eventos
     * @param {string} event - Tipo de evento
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
     * Obtém estatísticas do sistema
     * @returns {Object} Estatísticas detalhadas
     */
    getStats() {
        return {
            system: { ...this.stats },
            cache: this.modelCache.getStats(),
            performance: this.performanceMonitor.getCurrentMetrics(),
            models: {
                registered: this.activeModels.size,
                loaded: Array.from(this.activeModels.values()).filter(c => c.isLoaded).length,
                visible: Array.from(this.activeModels.values()).filter(c => c.isVisible).length
            },
            config: { ...this.config }
        };
    }

    /**
     * Limpa todos os recursos e para o sistema
     */
    cleanup() {
        console.log('Limpando LODManager...');
        
        // Parar monitoramento
        this.performanceMonitor.stopMonitoring();
        
        // Limpar cache
        this.modelCache.destroy();
        
        // Descarregar todos os modelos
        for (const entityId of this.activeModels.keys()) {
            this.unloadModel(entityId);
        }
        
        // Limpar timers
        if (this.optimizationTimeout) {
            clearTimeout(this.optimizationTimeout);
        }
        
        // Limpar callbacks
        Object.values(this.callbacks).forEach(set => set.clear());
        
        this.isInitialized = false;
        console.log('LODManager limpo');
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.LODManager = LODManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LODManager;
}