const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const { spawn } = require('child_process');
const logs = require('../../../Logs');

class WorkerManager {
    #activeProcesses = new Map();
    #pendingRestarts = new Map();
    #isShuttingDown = false;
    #workers = ['processarhashinicial', 'aplicarassinatura', 'distribuirconvitesignatario', 'processarbiometria', 'selardocumentovault', 'notificarcancelamentodocumento', 'enviardocumentoassinadosignatarios'];

    StartWorkers() {
        console.log("🚀 [MASTER] Iniciando Orquestrador de Workers...");
        this.#workers.forEach(worker => {
            this.IniciarUmWorker(worker);
        });

        // Aqui escuta o processo do arquivo. SIGNIT significa Signal Interrutp, ou seja, quando o processo é interrompido (CTRL+C)
        // SigmTERM é Signal Terminate, ou seja, quando o processo é finalizado por um comando de kill ou por um encerramento do sistema operacional
        process.on('SIGINT', () => this.ShutdownAllWorkers());
        process.on('SIGTERM', () => this.ShutdownAllWorkers());
    }

    IniciarUmWorker(fila) {
        if (this.#isShuttingDown) return;
        if (this.#activeProcesses.has(fila)) return;

        const processChild = spawn('node', [path.join(__dirname, 'register', 'index.js')], {
            env: { ...process.env, QUEUE_NAME: fila },
            stdio: ['inherit', 'inherit', 'pipe'] //Para passar os logs do processo filho para o processo pai, usamos 'pipe' no stderr. O stdout e stdin são herdados para que o processo filho possa usar o console normalmente.
        });

        logs.getInstance().info(`🟢 [CREATE] Processo criado para a fila [${fila}] com PID: ${processChild.pid}`);

        this.#activeProcesses.set(fila, processChild);

        this.MonitorWorkers(processChild, fila);
    }

    MonitorWorkers(processChild, fila) {
        processChild.on('exit', (code, sinal) => {
            this.#activeProcesses.delete(fila);

            if (code === 0) {
                logs.getInstance().info(`Processo da fila [${fila}] encerrado de forma voluntária.`);
                return;
            }
            //PArar cntrl + c
            if (sinal === 'SIGINT' || sinal === 'SIGTERM') {
                logs.getInstance().info(`Processo da fila [${fila}] recebeu sinal de encerramento (${sinal}). Considerando como parada voluntária.`);
                return;
            }

            // Se caiu de forma inesperada, loga o erro com os dados corretos do processo
            logs.getInstance().warn(`🚨 [READ] CRASH! O processo da fila [${fila}] quebrou.`);
            logs.getInstance().warn(`   ↳ PID antigo: ${processChild.pid} | Código de Erro: ${code} | Sinal: ${sinal}`);

            if (!this.#isShuttingDown) {
                this.RestartProcess(fila);
            }
        });

        processChild.stderr.on('data', (data) => {
            logs.getInstance().error(`❌ [ERRO FILHO - ${fila}]: ${data.toString()}`);
        });
    }

    RestartProcess(fila) {
        if (this.#isShuttingDown) return;

        const pending = this.#pendingRestarts.get(fila);
        if (pending) clearTimeout(pending);

        logs.getInstance().info(`🔄 [UPDATE] Reinicializando fila [${fila}] em 2 segundos...`);

        const timeoutId = setTimeout(() => {
            this.#pendingRestarts.delete(fila);
            this.IniciarUmWorker(fila);
        }, 2000);

        this.#pendingRestarts.set(fila, timeoutId);
    }


    ShutdownAllWorkers() {
        if (this.#isShuttingDown) return;
        this.#isShuttingDown = true;

        for (const timeoutId of this.#pendingRestarts.values()) {
            clearTimeout(timeoutId);
        }
        this.#pendingRestarts.clear();

        logs.getInstance().info("\n🛑 [MASTER] Sinal de encerramento recebido. Limpando subprocessos...");

        for (const [fila, processChild] of this.#activeProcesses.entries()) {
            logs.getInstance().info(`🔹 [DELETE] Finalizando worker de forma controlada: [${fila}] com PID: ${processChild.pid}`);

            processChild.removeAllListeners('exit');

            processChild.kill('SIGTERM');
        }

        setTimeout(() => {
            logs.getInstance().info("✅ [MASTER] Todos os processos filhos foram limpos. Encerrando orquestrador pai.");
            process.exit(0);
        }, 1000);
    }
}

// Capturar eventos globais para evitar que o Node.js morra por bobeira
process.on('uncaughtException', (error) => {
    console.error("⚠️ Erro não tratado no Orquestrador:", error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error("⚠️ Rejeição de promessa não tratada no Orquestrador:", reason);
});

// Inicialização correta da classe
const manager = new WorkerManager();
manager.StartWorkers();