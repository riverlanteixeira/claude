/**
 * @fileoverview Monitor de performance em tempo real para otimização de modelos 3D
 */

/**
 * Classe responsável por monitorar a performance da aplicação em tempo real
 * e notificar sobre problemas de performance para otimização automática
 */
class PerformanceMonitor {
    constructor(config = {}) {
        this.config = {
            targetFPS: 30,
            sampleSize: 60, // Número de frames para calcular média
            memoryCheckInterval: 1000, // Intervalo para verificar memória (ms)
            alertThreshold: 0.8, // Limite para alertas (80% do target)
            ...config
        };

        // Histórico de métricas
        this.fpsHistory = [];
        this.memoryHistory = [];
        this.renderTimeHistory = [];
        
        // Estado do monitoramento
        this.isMonitoring = false;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.startTime = performance.now();
        
        // Callbacks para notificações
        this.callbacks = new Set();
        
        // Métricas atuais
        this.currentMetrics = {
            fps: 0,
            memoryUsage: { used: 0, total: 0, percentage: 0 },
            renderTime: 0,
            loadTime: 0,
            activeModels: 0,
            cacheHitRate: 0
        };

        // Timer para verificação de memória
        this.memoryTimer = null;
        
        // Contador de problemas consecutivos
        this.consecutiveIssues = 0;
        this.maxConsecutiveIssues = 5;
    }

    /**
     * Inicia o monitoramento de performance
     */
    startMonitoring() {
        if (this.isMonitoring) {
            console.warn('Performance monitor já está ativo');
            return;
        }

        this.isMonitoring = true;
        this.startTime = performance.now();
        this.frameCount = 0;
        this.consecutiveIssues = 0;

        console.log('Iniciando monitoramento de performance...');
        
        // Iniciar loop de monitoramento de FPS
        this.monitorLoop();
        
        // Iniciar monitoramento de memória
        this.startMemoryMonitoring();
    }

    /**
     * Para o monitoramento de performance
     */
    stopMonitoring() {
        this.isMonitoring = false;
        
        if (this.memoryTimer) {
            clearInterval(this.memoryTimer);
            this.memoryTimer = null;
        }
        
        console.log('Monitoramento de performance parado');
    }

    /**
     * Loop principal de monitoramento
     * @private
     */
    monitorLoop() {
        if (!this.isMonitoring) return;

        const currentTime = performance.now();
        
        // Calcular FPS
        if (this.lastFrameTime > 0) {
            const deltaTime = currentTime - this.lastFrameTime;
            const fps = 1000 / deltaTime;
            
            this.addFPSSample(fps);
            this.currentMetrics.renderTime = deltaTime;
        }
        
        this.lastFrameTime = currentTime;
        this.frameCount++;
        
        // Verificar se há problemas de performance
        this.checkPerformanceIssues();
        
        // Continuar monitoramento
        requestAnimationFrame(() => this.monitorLoop());
    }

    /**
     * Adiciona uma amostra de FPS ao histórico
     * @private
     * @param {number} fps - Taxa de quadros atual
     */
    addFPSSample(fps) {
        this.fpsHistory.push(fps);
        
        // Manter apenas as últimas amostras
        if (this.fpsHistory.length > this.config.sampleSize) {
            this.fpsHistory.shift();
        }
        
        // Calcular FPS médio
        this.currentMetrics.fps = this.calculateAverageFPS();
    }

    /**
     * Calcula o FPS médio baseado no histórico
     * @private
     * @returns {number} FPS médio
     */
    calculateAverageFPS() {
        if (this.fpsHistory.length === 0) return 0;
        
        const sum = this.fpsHistory.reduce((acc, fps) => acc + fps, 0);
        return Math.round(sum / this.fpsHistory.length);
    }

    /**
     * Inicia o monitoramento de memória
     * @private
     */
    startMemoryMonitoring() {
        this.memoryTimer = setInterval(() => {
            this.updateMemoryMetrics();
        }, this.config.memoryCheckInterval);
    }

    /**
     * Atualiza as métricas de memória
     * @private
     */
    updateMemoryMetrics() {
        try {
            let memoryInfo = { used: 0, total: 0 };
            
            // Tentar usar a API de memória do navegador
            if ('memory' in performance) {
                const perfMemory = performance.memory;
                memoryInfo = {
                    used: perfMemory.usedJSHeapSize,
                    total: perfMemory.totalJSHeapSize,
                    limit: perfMemory.jsHeapSizeLimit
                };
            } else {
                // Fallback: estimar baseado no dispositivo
                memoryInfo = this.estimateMemoryUsage();
            }
            
            const percentage = memoryInfo.total > 0 ? 
                (memoryInfo.used / memoryInfo.total) * 100 : 0;
            
            this.currentMetrics.memoryUsage = {
                used: memoryInfo.used,
                total: memoryInfo.total,
                percentage: Math.round(percentage)
            };
            
            // Adicionar ao histórico
            this.memoryHistory.push(percentage);
            if (this.memoryHistory.length > this.config.sampleSize) {
                this.memoryHistory.shift();
            }
            
        } catch (error) {
            console.warn('Erro ao obter informações de memória:', error);
        }
    }

    /**
     * Estima o uso de memória quando a API não está disponível
     * @private
     * @returns {Object} Informações estimadas de memória
     */
    estimateMemoryUsage() {
        // Estimativa muito básica baseada no número de objetos na cena
        const sceneEl = document.querySelector('a-scene');
        if (!sceneEl) return { used: 0, total: 100 * 1024 * 1024 }; // 100MB padrão
        
        const entities = sceneEl.querySelectorAll('a-entity').length;
        const estimatedUsage = entities * 5 * 1024 * 1024; // 5MB por entidade (estimativa)
        
        return {
            used: estimatedUsage,
            total: 200 * 1024 * 1024 // 200MB estimado como total
        };
    }

    /**
     * Verifica se há problemas de performance
     * @private
     */
    checkPerformanceIssues() {
        const issues = [];
        
        // Verificar FPS baixo
        if (this.currentMetrics.fps < this.config.targetFPS * this.config.alertThreshold) {
            issues.push({
                type: 'low_fps',
                severity: this.calculateFPSSeverity(),
                data: {
                    current: this.currentMetrics.fps,
                    target: this.config.targetFPS,
                    threshold: this.config.targetFPS * this.config.alertThreshold
                }
            });
        }
        
        // Verificar uso alto de memória
        if (this.currentMetrics.memoryUsage.percentage > 80) {
            issues.push({
                type: 'high_memory',
                severity: this.calculateMemorySeverity(),
                data: {
                    percentage: this.currentMetrics.memoryUsage.percentage,
                    used: this.currentMetrics.memoryUsage.used,
                    total: this.currentMetrics.memoryUsage.total
                }
            });
        }
        
        // Verificar tempo de renderização alto
        if (this.currentMetrics.renderTime > 33) { // > 33ms = < 30 FPS
            issues.push({
                type: 'slow_render',
                severity: 'medium',
                data: {
                    renderTime: this.currentMetrics.renderTime,
                    threshold: 33
                }
            });
        }
        
        // Notificar sobre problemas encontrados
        if (issues.length > 0) {
            this.consecutiveIssues++;
            this.notifyPerformanceIssues(issues);
        } else {
            this.consecutiveIssues = 0;
        }
    }

    /**
     * Calcula a severidade dos problemas de FPS
     * @private
     * @returns {string} Nível de severidade
     */
    calculateFPSSeverity() {
        const ratio = this.currentMetrics.fps / this.config.targetFPS;
        
        if (ratio < 0.5) return 'critical';
        else if (ratio < 0.7) return 'high';
        else if (ratio < 0.8) return 'medium';
        else return 'low';
    }

    /**
     * Calcula a severidade dos problemas de memória
     * @private
     * @returns {string} Nível de severidade
     */
    calculateMemorySeverity() {
        const percentage = this.currentMetrics.memoryUsage.percentage;
        
        if (percentage > 95) return 'critical';
        else if (percentage > 90) return 'high';
        else if (percentage > 85) return 'medium';
        else return 'low';
    }

    /**
     * Notifica callbacks sobre problemas de performance
     * @private
     * @param {Array} issues - Lista de problemas detectados
     */
    notifyPerformanceIssues(issues) {
        const notification = {
            timestamp: Date.now(),
            issues,
            consecutiveCount: this.consecutiveIssues,
            metrics: { ...this.currentMetrics },
            recommendations: this.generateRecommendations(issues)
        };
        
        // Notificar todos os callbacks registrados
        this.callbacks.forEach(callback => {
            try {
                callback(notification);
            } catch (error) {
                console.error('Erro ao executar callback de performance:', error);
            }
        });
    }

    /**
     * Gera recomendações baseadas nos problemas detectados
     * @private
     * @param {Array} issues - Lista de problemas
     * @returns {Array} Lista de recomendações
     */
    generateRecommendations(issues) {
        const recommendations = [];
        
        issues.forEach(issue => {
            switch (issue.type) {
                case 'low_fps':
                    if (issue.severity === 'critical') {
                        recommendations.push('reduce_model_quality');
                        recommendations.push('reduce_active_models');
                    } else if (issue.severity === 'high') {
                        recommendations.push('optimize_lod_distances');
                    }
                    break;
                    
                case 'high_memory':
                    recommendations.push('clear_cache');
                    if (issue.severity === 'critical') {
                        recommendations.push('unload_distant_models');
                    }
                    break;
                    
                case 'slow_render':
                    recommendations.push('reduce_draw_calls');
                    recommendations.push('optimize_materials');
                    break;
            }
        });
        
        return [...new Set(recommendations)]; // Remover duplicatas
    }

    /**
     * Registra um callback para notificações de performance
     * @param {Function} callback - Função a ser chamada quando houver problemas
     */
    onPerformanceIssue(callback) {
        if (typeof callback !== 'function') {
            throw new Error('Callback deve ser uma função');
        }
        
        this.callbacks.add(callback);
    }

    /**
     * Remove um callback de notificações
     * @param {Function} callback - Callback a ser removido
     */
    removePerformanceCallback(callback) {
        this.callbacks.delete(callback);
    }

    /**
     * Obtém as métricas atuais de performance
     * @returns {PerformanceMetrics} Métricas atuais
     */
    getCurrentMetrics() {
        return { ...this.currentMetrics };
    }

    /**
     * Obtém estatísticas detalhadas de performance
     * @returns {Object} Estatísticas detalhadas
     */
    getDetailedStats() {
        return {
            current: { ...this.currentMetrics },
            history: {
                fps: [...this.fpsHistory],
                memory: [...this.memoryHistory],
                renderTime: [...this.renderTimeHistory]
            },
            averages: {
                fps: this.calculateAverageFPS(),
                memory: this.calculateAverageMemory(),
                renderTime: this.calculateAverageRenderTime()
            },
            monitoring: {
                isActive: this.isMonitoring,
                frameCount: this.frameCount,
                uptime: performance.now() - this.startTime,
                consecutiveIssues: this.consecutiveIssues
            }
        };
    }

    /**
     * Calcula o uso médio de memória
     * @private
     * @returns {number} Porcentagem média de uso de memória
     */
    calculateAverageMemory() {
        if (this.memoryHistory.length === 0) return 0;
        
        const sum = this.memoryHistory.reduce((acc, mem) => acc + mem, 0);
        return Math.round(sum / this.memoryHistory.length);
    }

    /**
     * Calcula o tempo médio de renderização
     * @private
     * @returns {number} Tempo médio em ms
     */
    calculateAverageRenderTime() {
        if (this.renderTimeHistory.length === 0) return 0;
        
        const sum = this.renderTimeHistory.reduce((acc, time) => acc + time, 0);
        return Math.round(sum / this.renderTimeHistory.length);
    }

    /**
     * Atualiza métricas específicas (para uso externo)
     * @param {string} metric - Nome da métrica
     * @param {*} value - Valor da métrica
     */
    updateMetric(metric, value) {
        if (metric in this.currentMetrics) {
            this.currentMetrics[metric] = value;
        }
    }

    /**
     * Reseta todas as métricas e histórico
     */
    reset() {
        this.fpsHistory = [];
        this.memoryHistory = [];
        this.renderTimeHistory = [];
        this.frameCount = 0;
        this.consecutiveIssues = 0;
        this.startTime = performance.now();
        
        this.currentMetrics = {
            fps: 0,
            memoryUsage: { used: 0, total: 0, percentage: 0 },
            renderTime: 0,
            loadTime: 0,
            activeModels: 0,
            cacheHitRate: 0
        };
    }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.PerformanceMonitor = PerformanceMonitor;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceMonitor;
}