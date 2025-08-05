/**
 * @fileoverview Tipos e interfaces TypeScript para o sistema de otimização de modelos 3D
 * Implementado em JSDoc para compatibilidade com JavaScript puro
 */

/**
 * @typedef {Object} ModelPaths
 * @property {string} high - Caminho para modelo de alta qualidade
 * @property {string} medium - Caminho para modelo de média qualidade
 * @property {string} low - Caminho para modelo de baixa qualidade
 */

/**
 * @typedef {Object} LODDistances
 * @property {number} near - Distância para alta qualidade (metros)
 * @property {number} medium - Distância para média qualidade (metros)
 * @property {number} far - Distância para baixa qualidade (metros)
 */

/**
 * @typedef {Object} LODConfig
 * @property {LODDistances} distances - Configurações de distância para LOD
 * @property {string[]} qualityLevels - Níveis de qualidade disponíveis
 * @property {number} transitionSpeed - Velocidade de transição entre níveis
 * @property {number} memoryThreshold - Limite de memória (0-1)
 * @property {number} targetFPS - FPS alvo para otimização
 * @property {boolean} autoOptimize - Otimização automática ativada
 */

/**
 * @typedef {Object} ModelConfig
 * @property {string} entityId - ID único da entidade
 * @property {ModelPaths} paths - Caminhos para diferentes qualidades
 * @property {LODDistances} lodDistances - Distâncias personalizadas para LOD
 * @property {string} currentQuality - Qualidade atual carregada
 * @property {boolean} isLoaded - Se o modelo está carregado
 * @property {boolean} isVisible - Se o modelo está visível
 * @property {number} lastUpdate - Timestamp da última atualização
 * @property {number} memoryUsage - Uso estimado de memória em bytes
 * @property {number} priority - Prioridade de carregamento (1-10)
 */

/**
 * @typedef {Object} PerformanceMetrics
 * @property {number} fps - Taxa de quadros atual
 * @property {Object} memoryUsage - Informações de uso de memória
 * @property {number} memoryUsage.used - Memória usada em bytes
 * @property {number} memoryUsage.total - Memória total disponível
 * @property {number} memoryUsage.percentage - Porcentagem de uso
 * @property {number} renderTime - Tempo de renderização em ms
 * @property {number} loadTime - Tempo de carregamento em ms
 * @property {number} activeModels - Número de modelos ativos
 * @property {number} cacheHitRate - Taxa de acerto do cache (0-1)
 */

/**
 * @typedef {Object} DeviceCapabilities
 * @property {string} tier - Nível do dispositivo ('low', 'medium', 'high')
 * @property {number} memory - Memória disponível em MB
 * @property {string} gpu - Informações da GPU
 * @property {number} maxTextureSize - Tamanho máximo de textura
 * @property {string[]} supportedFormats - Formatos suportados
 * @property {Object} recommendedSettings - Configurações recomendadas
 * @property {number} recommendedSettings.maxModels - Máximo de modelos simultâneos
 * @property {number[]} recommendedSettings.lodDistances - Distâncias LOD recomendadas
 * @property {number} recommendedSettings.cacheSize - Tamanho do cache em bytes
 */

/**
 * @typedef {Object} CacheEntry
 * @property {Object} model - Modelo 3D carregado
 * @property {number} size - Tamanho estimado em bytes
 * @property {number} lastAccess - Timestamp do último acesso
 * @property {number} accessCount - Número de acessos
 * @property {string} quality - Qualidade do modelo
 */

/**
 * @typedef {Object} LoadTask
 * @property {ModelPaths} paths - Caminhos dos modelos
 * @property {string} priority - Prioridade ('high', 'medium', 'low')
 * @property {Function} resolve - Função de resolução da Promise
 * @property {Function} reject - Função de rejeição da Promise
 * @property {number} timestamp - Timestamp da criação da tarefa
 * @property {string} entityId - ID da entidade associada
 */

/**
 * @typedef {Object} PerformanceBudgets
 * @property {Object} memory - Orçamentos de memória
 * @property {number} memory.total - Memória total para modelos
 * @property {number} memory.perModel - Memória por modelo
 * @property {number} memory.cache - Memória para cache
 * @property {Object} rendering - Orçamentos de renderização
 * @property {number} rendering.triangles - Máximo de triângulos por frame
 * @property {number} rendering.drawCalls - Máximo de draw calls
 * @property {number} rendering.textureMemory - Memória para texturas
 * @property {Object} loading - Orçamentos de carregamento
 * @property {number} loading.initialLoad - Tempo para carregamento inicial (ms)
 * @property {number} loading.modelSwap - Tempo para troca de modelo (ms)
 * @property {number} loading.backgroundLoad - Tempo para carregamento em background (ms)
 */

// Exportar tipos para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // Os tipos são apenas para documentação em JavaScript
        // Não há exportação real de tipos
    };
}