/**
 * @fileoverview Detector de capacidades do dispositivo para otimização de modelos 3D
 */

/**
 * Classe responsável por detectar e classificar as capacidades do dispositivo
 * para otimizar automaticamente as configurações de renderização 3D
 */
class DeviceDetector {
    constructor() {
        this.capabilities = null;
        this.isInitialized = false;
    }

    /**
     * Inicializa a detecção de capacidades do dispositivo
     * @returns {Promise<DeviceCapabilities>} Capacidades detectadas
     */
    async initialize() {
        if (this.isInitialized) {
            return this.capabilities;
        }

        try {
            this.capabilities = await this.detectCapabilities();
            this.isInitialized = true;
            console.log('Capacidades do dispositivo detectadas:', this.capabilities);
            return this.capabilities;
        } catch (error) {
            console.error('Erro ao detectar capacidades do dispositivo:', error);
            // Retornar configurações conservadoras como fallback
            this.capabilities = this.getDefaultCapabilities();
            this.isInitialized = true;
            return this.capabilities;
        }
    }

    /**
     * Detecta as capacidades do dispositivo
     * @private
     * @returns {Promise<DeviceCapabilities>}
     */
    async detectCapabilities() {
        const memory = this.detectMemory();
        const gpu = await this.detectGPU();
        const webglCapabilities = this.detectWebGLCapabilities();
        
        // Classificar dispositivo baseado nas capacidades
        const tier = this.classifyDevice(memory, gpu, webglCapabilities);
        
        return {
            tier,
            memory,
            gpu: gpu.renderer || 'Unknown',
            maxTextureSize: webglCapabilities.maxTextureSize,
            supportedFormats: webglCapabilities.supportedFormats,
            recommendedSettings: this.getRecommendedSettings(tier, memory)
        };
    }

    /**
     * Detecta a quantidade de memória disponível
     * @private
     * @returns {number} Memória em MB
     */
    detectMemory() {
        // Tentar usar a API de memória do navegador (experimental)
        if ('memory' in performance) {
            const memInfo = performance.memory;
            // Estimar memória total baseada no limite de heap
            const estimatedTotal = memInfo.jsHeapSizeLimit / (1024 * 1024);
            return Math.round(estimatedTotal);
        }

        // Fallback: estimar baseado no user agent
        const userAgent = navigator.userAgent.toLowerCase();
        
        if (userAgent.includes('mobile') || userAgent.includes('android')) {
            // Dispositivos móveis Android - estimativa conservadora
            if (userAgent.includes('android 4') || userAgent.includes('android 5')) {
                return 1024; // 1GB para versões antigas
            } else if (userAgent.includes('android 6') || userAgent.includes('android 7')) {
                return 2048; // 2GB para versões médias
            } else {
                return 4096; // 4GB para versões recentes
            }
        } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
            // Dispositivos iOS - estimativa baseada no modelo
            if (userAgent.includes('iphone os 12') || userAgent.includes('iphone os 13')) {
                return 3072; // 3GB para iPhones mais antigos
            } else {
                return 4096; // 4GB+ para iPhones recentes
            }
        }

        // Desktop ou desconhecido - assumir mais memória
        return 8192; // 8GB
    }

    /**
     * Detecta informações da GPU
     * @private
     * @returns {Promise<Object>}
     */
    async detectGPU() {
        try {
            // Criar contexto WebGL temporário para obter informações
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                return { renderer: 'WebGL não suportado', vendor: 'Unknown' };
            }

            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            let renderer = 'Unknown';
            let vendor = 'Unknown';

            if (debugInfo) {
                renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            } else {
                // Fallback para informações básicas
                renderer = gl.getParameter(gl.RENDERER);
                vendor = gl.getParameter(gl.VENDOR);
            }

            // Limpar contexto
            const loseContext = gl.getExtension('WEBGL_lose_context');
            if (loseContext) {
                loseContext.loseContext();
            }

            return { renderer, vendor };
        } catch (error) {
            console.warn('Erro ao detectar GPU:', error);
            return { renderer: 'Detecção falhou', vendor: 'Unknown' };
        }
    }

    /**
     * Detecta capacidades do WebGL
     * @private
     * @returns {Object}
     */
    detectWebGLCapabilities() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            
            if (!gl) {
                return {
                    maxTextureSize: 512,
                    supportedFormats: ['jpg', 'png']
                };
            }

            const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
            const supportedFormats = ['jpg', 'png', 'webp'];

            // Verificar suporte a formatos comprimidos
            const extensions = gl.getSupportedExtensions();
            if (extensions.includes('WEBGL_compressed_texture_s3tc')) {
                supportedFormats.push('dxt');
            }
            if (extensions.includes('WEBGL_compressed_texture_etc')) {
                supportedFormats.push('etc');
            }
            if (extensions.includes('WEBGL_compressed_texture_astc')) {
                supportedFormats.push('astc');
            }

            // Limpar contexto
            const loseContext = gl.getExtension('WEBGL_lose_context');
            if (loseContext) {
                loseContext.loseContext();
            }

            return {
                maxTextureSize,
                supportedFormats
            };
        } catch (error) {
            console.warn('Erro ao detectar capacidades WebGL:', error);
            return {
                maxTextureSize: 512,
                supportedFormats: ['jpg', 'png']
            };
        }
    }

    /**
     * Classifica o dispositivo em tiers baseado nas capacidades
     * @private
     * @param {number} memory - Memória em MB
     * @param {Object} gpu - Informações da GPU
     * @param {Object} webglCapabilities - Capacidades WebGL
     * @returns {string} Tier do dispositivo ('low', 'medium', 'high')
     */
    classifyDevice(memory, gpu, webglCapabilities) {
        let score = 0;

        // Pontuação baseada na memória
        if (memory >= 6144) score += 3; // 6GB+
        else if (memory >= 3072) score += 2; // 3-6GB
        else if (memory >= 1536) score += 1; // 1.5-3GB
        // < 1.5GB = 0 pontos

        // Pontuação baseada na GPU
        const renderer = gpu.renderer.toLowerCase();
        if (renderer.includes('adreno 7') || renderer.includes('mali-g7') || 
            renderer.includes('apple a1') || renderer.includes('apple m')) {
            score += 3; // GPUs high-end
        } else if (renderer.includes('adreno 6') || renderer.includes('mali-g5') || 
                   renderer.includes('apple a1')) {
            score += 2; // GPUs mid-range
        } else if (renderer.includes('adreno 5') || renderer.includes('mali-g') || 
                   renderer.includes('apple a')) {
            score += 1; // GPUs básicas modernas
        }
        // GPUs muito antigas = 0 pontos

        // Pontuação baseada nas capacidades WebGL
        if (webglCapabilities.maxTextureSize >= 4096) score += 2;
        else if (webglCapabilities.maxTextureSize >= 2048) score += 1;

        if (webglCapabilities.supportedFormats.length > 3) score += 1;

        // Classificar baseado na pontuação total
        if (score >= 7) return 'high';
        else if (score >= 4) return 'medium';
        else return 'low';
    }

    /**
     * Obtém configurações recomendadas baseadas no tier do dispositivo
     * @private
     * @param {string} tier - Tier do dispositivo
     * @param {number} memory - Memória disponível em MB
     * @returns {Object} Configurações recomendadas
     */
    getRecommendedSettings(tier, memory) {
        const baseSettings = {
            low: {
                maxModels: 2,
                lodDistances: [2, 5, 10],
                cacheSize: Math.min(memory * 0.1, 50) * 1024 * 1024, // 10% da memória, máx 50MB
                targetFPS: 24,
                maxTextureSize: 512
            },
            medium: {
                maxModels: 4,
                lodDistances: [3, 8, 15],
                cacheSize: Math.min(memory * 0.15, 100) * 1024 * 1024, // 15% da memória, máx 100MB
                targetFPS: 30,
                maxTextureSize: 1024
            },
            high: {
                maxModels: 8,
                lodDistances: [4, 10, 20],
                cacheSize: Math.min(memory * 0.2, 200) * 1024 * 1024, // 20% da memória, máx 200MB
                targetFPS: 60,
                maxTextureSize: 2048
            }
        };

        return baseSettings[tier] || baseSettings.low;
    }

    /**
     * Retorna capacidades padrão como fallback
     * @private
     * @returns {DeviceCapabilities}
     */
    getDefaultCapabilities() {
        return {
            tier: 'low',
            memory: 2048,
            gpu: 'Unknown',
            maxTextureSize: 512,
            supportedFormats: ['jpg', 'png'],
            recommendedSettings: {
                maxModels: 2,
                lodDistances: [2, 5, 10],
                cacheSize: 50 * 1024 * 1024, // 50MB
                targetFPS: 24,
                maxTextureSize: 512
            }
        };
    }

    /**
     * Obtém as capacidades detectadas
     * @returns {DeviceCapabilities|null}
     */
    getCapabilities() {
        return this.capabilities;
    }

    /**
     * Verifica se o dispositivo suporta uma funcionalidade específica
     * @param {string} feature - Nome da funcionalidade
     * @returns {boolean}
     */
    supportsFeature(feature) {
        if (!this.capabilities) return false;

        switch (feature) {
            case 'webgl2':
                return this.detectWebGL2Support();
            case 'webxr':
                return 'xr' in navigator;
            case 'compressed-textures':
                return this.capabilities.supportedFormats.length > 2;
            default:
                return false;
        }
    }

    /**
     * Detecta suporte ao WebGL 2.0
     * @private
     * @returns {boolean}
     */
    detectWebGL2Support() {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl2');
            return !!gl;
        } catch (error) {
            return false;
        }
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.DeviceDetector = DeviceDetector;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = DeviceDetector;
}