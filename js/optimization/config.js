/**
 * @fileoverview Configurações padrão para o sistema de otimização de modelos 3D
 */

/**
 * Configurações padrão do sistema de otimização
 */
const OptimizationConfig = {
    // Configurações de LOD (Level of Detail)
    lod: {
        distances: {
            near: 3,    // Distância para alta qualidade (metros)
            medium: 8,  // Distância para média qualidade (metros)
            far: 15     // Distância para baixa qualidade (metros)
        },
        qualityLevels: ['low', 'medium', 'high'],
        transitionSpeed: 0.5,           // Velocidade de transição entre níveis
        autoOptimize: true,             // Otimização automática ativada
        maxActiveModels: 10,            // Máximo de modelos ativos simultaneamente
        preloadDistance: 20             // Distância para pré-carregamento
    },

    // Configurações de cache
    cache: {
        maxSize: 100 * 1024 * 1024,     // 100MB máximo
        maxEntries: 50,                 // Máximo de entradas
        memoryThreshold: 0.8,           // 80% do limite para limpeza
        cleanupInterval: 30000          // Limpeza automática a cada 30s
    },

    // Configurações de monitoramento de performance
    performance: {
        targetFPS: 30,                  // FPS alvo
        sampleSize: 60,                 // Amostras para calcular média
        memoryCheckInterval: 1000,      // Intervalo de verificação de memória (ms)
        alertThreshold: 0.8             // Limite para alertas (80% do target)
    },

    // Orçamentos de performance por tier de dispositivo
    budgets: {
        low: {
            memory: {
                total: 50 * 1024 * 1024,    // 50MB para modelos
                perModel: 5 * 1024 * 1024,  // 5MB por modelo
                cache: 20 * 1024 * 1024     // 20MB para cache
            },
            rendering: {
                triangles: 20000,           // Máximo de triângulos por frame
                drawCalls: 10,              // Máximo de draw calls
                textureMemory: 10 * 1024 * 1024 // 10MB para texturas
            },
            loading: {
                initialLoad: 5000,          // 5s para carregamento inicial
                modelSwap: 1000,            // 1s para troca de modelo
                backgroundLoad: 15000       // 15s para carregamento em background
            }
        },
        medium: {
            memory: {
                total: 100 * 1024 * 1024,   // 100MB para modelos
                perModel: 10 * 1024 * 1024, // 10MB por modelo
                cache: 50 * 1024 * 1024     // 50MB para cache
            },
            rendering: {
                triangles: 50000,           // Máximo de triângulos por frame
                drawCalls: 20,              // Máximo de draw calls
                textureMemory: 30 * 1024 * 1024 // 30MB para texturas
            },
            loading: {
                initialLoad: 3000,          // 3s para carregamento inicial
                modelSwap: 500,             // 500ms para troca de modelo
                backgroundLoad: 10000       // 10s para carregamento em background
            }
        },
        high: {
            memory: {
                total: 200 * 1024 * 1024,   // 200MB para modelos
                perModel: 20 * 1024 * 1024, // 20MB por modelo
                cache: 100 * 1024 * 1024    // 100MB para cache
            },
            rendering: {
                triangles: 100000,          // Máximo de triângulos por frame
                drawCalls: 30,              // Máximo de draw calls
                textureMemory: 60 * 1024 * 1024 // 60MB para texturas
            },
            loading: {
                initialLoad: 2000,          // 2s para carregamento inicial
                modelSwap: 300,             // 300ms para troca de modelo
                backgroundLoad: 8000        // 8s para carregamento em background
            }
        }
    },

    // Configurações específicas para WebXR
    webxr: {
        frustumCulling: true,           // Ativar frustum culling
        occlusionCulling: false,        // Occlusion culling (experimental)
        temporalCoherence: true,        // Usar coerência temporal
        adaptiveQuality: true,          // Qualidade adaptativa baseada em movimento
        motionThreshold: 0.1            // Limite de movimento para adaptação
    },

    // Configurações de debug e logging
    debug: {
        enabled: false,                 // Debug mode
        logLevel: 'info',              // 'debug', 'info', 'warn', 'error'
        showStats: false,              // Mostrar estatísticas na tela
        logPerformance: true,          // Log de métricas de performance
        logCacheOperations: false      // Log de operações de cache
    }
};

/**
 * Configurações específicas para diferentes tipos de modelo
 */
const ModelTypeConfigs = {
    character: {
        lodDistances: { near: 2, medium: 6, far: 12 },
        priority: 8,
        preload: true,
        qualityBias: 1.2  // Preferir qualidade maior para personagens
    },
    
    prop: {
        lodDistances: { near: 4, medium: 10, far: 20 },
        priority: 5,
        preload: false,
        qualityBias: 0.8  // Qualidade menor para props
    },
    
    environment: {
        lodDistances: { near: 8, medium: 20, far: 50 },
        priority: 3,
        preload: false,
        qualityBias: 0.6  // Qualidade bem menor para ambiente
    },
    
    ui: {
        lodDistances: { near: 1, medium: 3, far: 6 },
        priority: 10,
        preload: true,
        qualityBias: 1.5  // Máxima qualidade para elementos de UI
    }
};

/**
 * Presets de configuração para diferentes cenários
 */
const ConfigPresets = {
    // Configuração para máxima qualidade (dispositivos high-end)
    quality: {
        lod: {
            distances: { near: 5, medium: 12, far: 25 },
            autoOptimize: false
        },
        performance: {
            targetFPS: 60
        },
        cache: {
            maxSize: 200 * 1024 * 1024
        }
    },

    // Configuração para máxima performance (dispositivos low-end)
    performance: {
        lod: {
            distances: { near: 2, medium: 5, far: 10 },
            autoOptimize: true,
            maxActiveModels: 5
        },
        performance: {
            targetFPS: 24
        },
        cache: {
            maxSize: 30 * 1024 * 1024
        }
    },

    // Configuração balanceada (padrão)
    balanced: {
        // Usa as configurações padrão do OptimizationConfig
    },

    // Configuração para desenvolvimento/debug
    development: {
        debug: {
            enabled: true,
            logLevel: 'debug',
            showStats: true,
            logPerformance: true,
            logCacheOperations: true
        },
        lod: {
            autoOptimize: false
        }
    }
};

/**
 * Utilitário para mesclar configurações
 * @param {Object} baseConfig - Configuração base
 * @param {Object} overrides - Configurações para sobrescrever
 * @returns {Object} Configuração mesclada
 */
function mergeConfigs(baseConfig, overrides) {
    const merged = JSON.parse(JSON.stringify(baseConfig)); // Deep clone
    
    function deepMerge(target, source) {
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) target[key] = {};
                deepMerge(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        }
    }
    
    deepMerge(merged, overrides);
    return merged;
}

/**
 * Cria configuração baseada no preset e overrides
 * @param {string} preset - Nome do preset ('quality', 'performance', 'balanced', 'development')
 * @param {Object} overrides - Configurações adicionais
 * @returns {Object} Configuração final
 */
function createConfig(preset = 'balanced', overrides = {}) {
    let baseConfig = OptimizationConfig;
    
    if (preset !== 'balanced' && ConfigPresets[preset]) {
        baseConfig = mergeConfigs(OptimizationConfig, ConfigPresets[preset]);
    }
    
    return mergeConfigs(baseConfig, overrides);
}

/**
 * Obtém configuração para tipo de modelo específico
 * @param {string} modelType - Tipo do modelo ('character', 'prop', 'environment', 'ui')
 * @returns {Object} Configuração do tipo de modelo
 */
function getModelTypeConfig(modelType) {
    return ModelTypeConfigs[modelType] || ModelTypeConfigs.prop;
}

/**
 * Valida configuração
 * @param {Object} config - Configuração a ser validada
 * @returns {Object} Resultado da validação
 */
function validateConfig(config) {
    const errors = [];
    const warnings = [];
    
    // Validar configurações obrigatórias
    if (!config.lod || !config.lod.distances) {
        errors.push('Configuração LOD distances é obrigatória');
    }
    
    if (!config.performance || !config.performance.targetFPS) {
        errors.push('Configuração targetFPS é obrigatória');
    }
    
    // Validar valores
    if (config.lod && config.lod.distances) {
        const { near, medium, far } = config.lod.distances;
        if (near >= medium || medium >= far) {
            errors.push('Distâncias LOD devem ser crescentes: near < medium < far');
        }
    }
    
    if (config.cache && config.cache.maxSize < 10 * 1024 * 1024) {
        warnings.push('Cache muito pequeno (< 10MB) pode impactar performance');
    }
    
    if (config.performance && config.performance.targetFPS < 15) {
        warnings.push('FPS alvo muito baixo (< 15) pode prejudicar experiência');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        warnings
    };
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.OptimizationConfig = OptimizationConfig;
    window.ModelTypeConfigs = ModelTypeConfigs;
    window.ConfigPresets = ConfigPresets;
    window.createConfig = createConfig;
    window.getModelTypeConfig = getModelTypeConfig;
    window.validateConfig = validateConfig;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        OptimizationConfig,
        ModelTypeConfigs,
        ConfigPresets,
        createConfig,
        getModelTypeConfig,
        validateConfig,
        mergeConfigs
    };
}