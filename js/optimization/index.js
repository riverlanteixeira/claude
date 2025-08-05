/**
 * @fileoverview Arquivo principal do sistema de otimização de modelos 3D
 * Integra todos os componentes e fornece uma API unificada
 */

/**
 * Sistema de Otimização de Modelos 3D
 * Classe principal que integra todos os componentes do sistema
 */
class ModelOptimizationSystem {
    constructor(config = {}) {
        // Mesclar configuração com padrões
        this.config = createConfig('balanced', config);
        
        // Validar configuração
        const validation = validateConfig(this.config);
        if (!validation.isValid) {
            throw new Error(`Configuração inválida: ${validation.errors.join(', ')}`);
        }
        
        if (validation.warnings.length > 0) {
            console.warn('Avisos de configuração:', validation.warnings);
        }
        
        // Inicializar componentes principais
        this.lodManager = null;
        this.isInitialized = false;
        this.isDestroyed = false;
        
        // Estado do sistema
        this.registeredModels = new Map();
        this.activeOptimizations = new Set();
        
        // Métricas globais
        this.globalStats = {
            systemStartTime: Date.now(),
            totalModelsProcessed: 0,
            totalOptimizationRuns: 0,
            totalMemorySaved: 0,
            averageLoadTime: 0
        };
        
        console.log('Sistema de Otimização de Modelos 3D criado:', {
            preset: config.preset || 'balanced',
            targetFPS: this.config.performance.targetFPS,
            cacheSize: `${(this.config.cache.maxSize / 1024 / 1024).toFixed(1)}MB`
        });
    }

    /**
     * Inicializa o sistema de otimização
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isInitialized) {
            console.warn('Sistema já foi inicializado');
            return;
        }

        if (this.isDestroyed) {
            throw new Error('Sistema foi destruído e não pode ser reinicializado');
        }

        console.log('Inicializando Sistema de Otimização de Modelos 3D...');

        try {
            // Criar LODManager com configurações
            this.lodManager = new LODManager({
                ...this.config.lod,
                cacheSize: this.config.cache.maxSize,
                maxCacheEntries: this.config.cache.maxEntries,
                targetFPS: this.config.performance.targetFPS
            });

            // Inicializar LODManager
            await this.lodManager.initialize();

            // Configurar callbacks do sistema
            this.setupSystemCallbacks();

            // Configurar logging se habilitado
            if (this.config.debug.enabled) {
                this.setupDebugLogging();
            }

            this.isInitialized = true;
            console.log('Sistema de Otimização inicializado com sucesso');

        } catch (error) {
            console.error('Erro ao inicializar sistema de otimização:', error);
            throw error;
        }
    }

    /**
     * Configura callbacks do sistema
     * @private
     */
    setupSystemCallbacks() {
        // Callback para mudanças de qualidade
        this.lodManager.on('qualityChange', (data) => {
            this.globalStats.totalOptimizationRuns++;
            
            if (this.config.debug.logPerformance) {
                console.log(`Qualidade alterada: ${data.entityId} ${data.previousQuality} → ${data.newQuality}`);
            }
        });

        // Callback para carregamento de modelos
        this.lodManager.on('modelLoad', (data) => {
            this.globalStats.totalModelsProcessed++;
            
            if (this.config.debug.logPerformance) {
                console.log(`Modelo carregado: ${data.entityId}`);
            }
        });

        // Callback para início de otimização
        this.lodManager.on('optimizationStart', (data) => {
            if (this.config.debug.logPerformance) {
                console.log('Otimização iniciada:', data);
            }
        });

        // Callback para fim de otimização
        this.lodManager.on('optimizationEnd', (data) => {
            if (this.config.debug.logPerformance) {
                console.log('Otimização concluída:', data);
            }
        });
    }

    /**
     * Configura logging de debug
     * @private
     */
    setupDebugLogging() {
        // Log periódico de estatísticas se habilitado
        if (this.config.debug.showStats) {
            this.statsInterval = setInterval(() => {
                const stats = this.getSystemStats();
                console.table({
                    'FPS Atual': stats.performance.fps,
                    'Uso de Memória': `${stats.performance.memoryUsage.percentage}%`,
                    'Modelos Ativos': stats.models.loaded,
                    'Cache Hit Rate': `${stats.cache.performance.hitRate}%`,
                    'Otimizações': stats.system.totalOptimizationRuns
                });
            }, 5000); // A cada 5 segundos
        }
    }

    /**
     * Registra um modelo no sistema de otimização
     * @param {string} entityId - ID único da entidade
     * @param {ModelPaths} modelPaths - Caminhos para diferentes qualidades
     * @param {Object} options - Opções adicionais
     * @returns {Promise<void>}
     */
    async registerModel(entityId, modelPaths, options = {}) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Determinar tipo de modelo e aplicar configurações específicas
        const modelType = options.type || 'prop';
        const typeConfig = getModelTypeConfig(modelType);
        
        // Mesclar opções com configurações do tipo
        const finalOptions = {
            ...typeConfig,
            ...options,
            element: options.element || document.getElementById(entityId)
        };

        // Registrar no LODManager
        await this.lodManager.registerModel(entityId, modelPaths, finalOptions);

        // Armazenar informações do modelo
        this.registeredModels.set(entityId, {
            paths: modelPaths,
            type: modelType,
            options: finalOptions,
            registeredAt: Date.now()
        });

        console.log(`Modelo registrado no sistema: ${entityId} (${modelType})`);
    }

    /**
     * Atualiza LOD de um modelo baseado na posição da câmera
     * @param {string} entityId - ID da entidade
     * @param {Object} cameraData - Dados da câmera
     * @returns {Promise<void>}
     */
    async updateModelLOD(entityId, cameraData) {
        if (!this.isInitialized) {
            console.warn('Sistema não inicializado');
            return;
        }

        await this.lodManager.updateModelLOD(entityId, cameraData);
    }

    /**
     * Força otimização do sistema
     * @param {number} targetFPS - FPS alvo (opcional)
     * @returns {Promise<void>}
     */
    async optimizeSystem(targetFPS = null) {
        if (!this.isInitialized) {
            console.warn('Sistema não inicializado');
            return;
        }

        await this.lodManager.optimizeForPerformance(targetFPS);
    }

    /**
     * Obtém estatísticas completas do sistema
     * @returns {Object} Estatísticas detalhadas
     */
    getSystemStats() {
        if (!this.isInitialized) {
            return { error: 'Sistema não inicializado' };
        }

        const lodStats = this.lodManager.getStats();
        
        return {
            ...lodStats,
            global: {
                ...this.globalStats,
                uptime: Date.now() - this.globalStats.systemStartTime,
                registeredModels: this.registeredModels.size
            },
            config: {
                preset: this.config.preset || 'custom',
                targetFPS: this.config.performance.targetFPS,
                cacheSize: this.config.cache.maxSize,
                autoOptimize: this.config.lod.autoOptimize
            }
        };
    }

    /**
     * Obtém informações de um modelo específico
     * @param {string} entityId - ID da entidade
     * @returns {Object|null} Informações do modelo
     */
    getModelInfo(entityId) {
        const registeredInfo = this.registeredModels.get(entityId);
        if (!registeredInfo) return null;

        const lodInfo = this.lodManager.activeModels.get(entityId);
        
        return {
            ...registeredInfo,
            currentState: lodInfo || null,
            isActive: !!lodInfo,
            isLoaded: lodInfo?.isLoaded || false,
            currentQuality: lodInfo?.currentQuality || null
        };
    }

    /**
     * Remove um modelo do sistema
     * @param {string} entityId - ID da entidade
     */
    unregisterModel(entityId) {
        if (!this.isInitialized) return;

        // Descarregar do LODManager
        this.lodManager.unloadModel(entityId);

        // Remover do registro
        this.registeredModels.delete(entityId);

        console.log(`Modelo removido do sistema: ${entityId}`);
    }

    /**
     * Atualiza configuração do sistema em tempo real
     * @param {Object} newConfig - Nova configuração
     */
    updateConfig(newConfig) {
        const mergedConfig = mergeConfigs(this.config, newConfig);
        const validation = validateConfig(mergedConfig);
        
        if (!validation.isValid) {
            throw new Error(`Configuração inválida: ${validation.errors.join(', ')}`);
        }

        this.config = mergedConfig;
        
        // Aplicar mudanças ao LODManager se inicializado
        if (this.isInitialized && this.lodManager) {
            // Atualizar configurações que podem ser alteradas em tempo real
            if (newConfig.lod) {
                Object.assign(this.lodManager.config, newConfig.lod);
            }
            
            if (newConfig.performance) {
                this.lodManager.performanceMonitor.config.targetFPS = 
                    newConfig.performance.targetFPS || this.config.performance.targetFPS;
            }
        }

        console.log('Configuração do sistema atualizada');
    }

    /**
     * Exporta configuração atual
     * @returns {Object} Configuração atual
     */
    exportConfig() {
        return JSON.parse(JSON.stringify(this.config));
    }

    /**
     * Importa configuração de um objeto
     * @param {Object} config - Configuração a ser importada
     */
    importConfig(config) {
        this.updateConfig(config);
    }

    /**
     * Pausa o sistema de otimização
     */
    pause() {
        if (this.isInitialized && this.lodManager) {
            this.lodManager.performanceMonitor.stopMonitoring();
            console.log('Sistema de otimização pausado');
        }
    }

    /**
     * Resume o sistema de otimização
     */
    resume() {
        if (this.isInitialized && this.lodManager) {
            this.lodManager.performanceMonitor.startMonitoring();
            console.log('Sistema de otimização resumido');
        }
    }

    /**
     * Destrói o sistema e libera recursos
     */
    destroy() {
        if (this.isDestroyed) return;

        console.log('Destruindo Sistema de Otimização de Modelos 3D...');

        // Parar intervalos de debug
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }

        // Limpar LODManager
        if (this.lodManager) {
            this.lodManager.cleanup();
        }

        // Limpar registros
        this.registeredModels.clear();
        this.activeOptimizations.clear();

        this.isInitialized = false;
        this.isDestroyed = true;

        console.log('Sistema de Otimização destruído');
    }
}

/**
 * Instância global do sistema (singleton)
 */
let globalOptimizationSystem = null;

/**
 * Obtém ou cria a instância global do sistema
 * @param {Object} config - Configuração inicial (apenas na primeira chamada)
 * @returns {ModelOptimizationSystem} Instância do sistema
 */
function getOptimizationSystem(config = {}) {
    if (!globalOptimizationSystem) {
        globalOptimizationSystem = new ModelOptimizationSystem(config);
    }
    return globalOptimizationSystem;
}

/**
 * Inicializa o sistema global
 * @param {Object} config - Configuração do sistema
 * @returns {Promise<ModelOptimizationSystem>} Sistema inicializado
 */
async function initializeOptimizationSystem(config = {}) {
    const system = getOptimizationSystem(config);
    await system.initialize();
    return system;
}

/**
 * Função de conveniência para registrar modelo
 * @param {string} entityId - ID da entidade
 * @param {ModelPaths} modelPaths - Caminhos dos modelos
 * @param {Object} options - Opções adicionais
 * @returns {Promise<void>}
 */
async function registerOptimizedModel(entityId, modelPaths, options = {}) {
    const system = getOptimizationSystem();
    await system.registerModel(entityId, modelPaths, options);
}

/**
 * Função de conveniência para atualizar LOD
 * @param {string} entityId - ID da entidade
 * @param {Object} cameraData - Dados da câmera
 * @returns {Promise<void>}
 */
async function updateModelLOD(entityId, cameraData) {
    const system = getOptimizationSystem();
    await system.updateModelLOD(entityId, cameraData);
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.ModelOptimizationSystem = ModelOptimizationSystem;
    window.getOptimizationSystem = getOptimizationSystem;
    window.initializeOptimizationSystem = initializeOptimizationSystem;
    window.registerOptimizedModel = registerOptimizedModel;
    window.updateModelLOD = updateModelLOD;
    
    // Disponibilizar sistema global
    window.optimizationSystem = null;
    
    // Auto-inicializar quando DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            console.log('Sistema de Otimização de Modelos 3D carregado e pronto para uso');
        });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ModelOptimizationSystem,
        getOptimizationSystem,
        initializeOptimizationSystem,
        registerOptimizedModel,
        updateModelLOD
    };
}