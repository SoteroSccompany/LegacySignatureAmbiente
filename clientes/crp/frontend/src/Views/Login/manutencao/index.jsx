import { useEffect, useState } from "react"
import Footer from "../../../Components/Footer"
import { jsonConfig } from "../../../Config"
import { WrenchScrewdriverIcon } from '@heroicons/react/24/outline'
import './index.css'

const Login = () => {
    const [currentTask, setCurrentTask] = useState(0)
    const [dots, setDots] = useState('')

    const tasks = [
        "Atualizando sistemas",
        "Otimizando performance",
        "Verificando segurança"
    ]

    useEffect(() => {
        // Rotação das tarefas
        const taskInterval = setInterval(() => {
            setCurrentTask(prev => (prev + 1) % tasks.length)
        }, 3000)

        // Animação dos pontos
        const dotsInterval = setInterval(() => {
            setDots(prev => prev.length >= 3 ? '' : prev + '.')
        }, 500)

        return () => {
            clearInterval(taskInterval)
            clearInterval(dotsInterval)
        }
    }, [])

    return (
        <div className="h-screen bg-gradient-to-br from-slate-900 via-cyan-900 to-blue-900 flex items-center justify-center overflow-hidden relative">
            {/* Estrelas animadas no fundo */}
            <div className="absolute inset-0">
                {[...Array(50)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
                        style={{
                            top: `${Math.random() * 100}%`,
                            left: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 3}s`,
                            animationDuration: `${2 + Math.random() * 3}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className="relative z-10 max-w-4xl w-full px-4 flex flex-col items-center">
                {/* Logo */}
                <div className="mb-6 animate-float">
                    <img
                        className="h-20 w-auto drop-shadow-2xl"
                        src={`${jsonConfig.urlReact}/logo.png`}
                        alt="Netexperts Logo"
                    />
                </div>

                {/* Título */}
                <h1 className="text-4xl md:text-5xl font-bold text-center mb-2 text-white drop-shadow-lg animate-fade-in">
                    Estamos em Manutenção
                </h1>
                <p className="text-cyan-200 text-lg mb-8 animate-fade-in-delay">
                    {tasks[currentTask]}{dots}
                </p>

                {/* Cena de Manutenção Animada */}
                <div className="relative w-full max-w-2xl h-64 mb-8">
                    {/* Plataforma/Chão */}
                    <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 rounded-full shadow-lg"></div>

                    {/* Servidor/Computador Central */}
                    <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 w-32 h-40">
                        {/* Corpo do servidor */}
                        <div className="relative w-full h-full bg-gradient-to-b from-gray-700 to-gray-800 rounded-lg shadow-2xl border-2 border-gray-600">
                            {/* Luzes do servidor piscando */}
                            <div className="absolute top-4 left-4 right-4 flex gap-2">
                                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse shadow-lg shadow-green-400/50"></div>
                                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse-slow shadow-lg shadow-blue-400/50" style={{ animationDelay: '0.3s' }}></div>
                                <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse shadow-lg shadow-cyan-400/50" style={{ animationDelay: '0.6s' }}></div>
                            </div>
                            {/* Slots do servidor */}
                            <div className="absolute top-12 left-3 right-3 space-y-2">
                                <div className="h-2 bg-gray-900 rounded"></div>
                                <div className="h-2 bg-gray-900 rounded"></div>
                                <div className="h-2 bg-cyan-500/30 rounded animate-pulse"></div>
                            </div>
                            {/* Tela do servidor */}
                            <div className="absolute bottom-4 left-3 right-3 h-12 bg-cyan-900 rounded border border-cyan-500/50 flex items-center justify-center">
                                <div className="text-green-400 text-xs font-mono animate-pulse">UPDATING...</div>
                            </div>
                        </div>
                    </div>

                    {/* Engrenagem Esquerda */}
                    <div className="absolute bottom-20 left-1/4 transform -translate-x-1/2">
                        <div className="w-20 h-20 animate-spin-slow">
                            <svg viewBox="0 0 100 100" className="w-full h-full text-cyan-400 drop-shadow-lg">
                                <path fill="currentColor" d="M50,10 L55,25 L70,20 L65,35 L80,35 L70,45 L80,55 L65,55 L70,70 L55,65 L50,80 L45,65 L30,70 L35,55 L20,55 L30,45 L20,35 L35,35 L30,20 L45,25 Z">
                                    <animateTransform attributeName="transform" type="rotate" from="0 50 50" to="360 50 50" dur="4s" repeatCount="indefinite" />
                                </path>
                                <circle cx="50" cy="50" r="15" fill="currentColor" />
                            </svg>
                        </div>
                    </div>

                    {/* Engrenagem Direita */}
                    <div className="absolute bottom-20 right-1/4 transform translate-x-1/2">
                        <div className="w-16 h-16 animate-spin-reverse">
                            <svg viewBox="0 0 100 100" className="w-full h-full text-blue-400 drop-shadow-lg">
                                <path fill="currentColor" d="M50,10 L55,25 L70,20 L65,35 L80,35 L70,45 L80,55 L65,55 L70,70 L55,65 L50,80 L45,65 L30,70 L35,55 L20,55 L30,45 L20,35 L35,35 L30,20 L45,25 Z">
                                    <animateTransform attributeName="transform" type="rotate" from="360 50 50" to="0 50 50" dur="3s" repeatCount="indefinite" />
                                </path>
                                <circle cx="50" cy="50" r="12" fill="currentColor" />
                            </svg>
                        </div>
                    </div>

                    {/* Robô/Boneco Técnico Esquerdo */}
                    <div className="absolute bottom-8 left-12 animate-bounce-subtle">
                        <div className="relative">
                            {/* Cabeça */}
                            <div className="w-12 h-12 bg-gradient-to-b from-gray-300 to-gray-400 rounded-lg mb-1 relative shadow-lg">
                                <div className="absolute top-2 left-2 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                                <div className="absolute top-2 right-2 w-3 h-3 bg-cyan-400 rounded-full animate-pulse"></div>
                                <div className="absolute bottom-2 left-3 right-3 h-1 bg-gray-600 rounded"></div>
                                {/* Antena */}
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-1 h-4 bg-gray-400"></div>
                                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                            </div>
                            {/* Corpo */}
                            <div className="w-12 h-16 bg-gradient-to-b from-cyan-500 to-cyan-600 rounded shadow-lg relative">
                                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                                <div className="absolute top-6 left-2 right-2 h-1 bg-cyan-700 rounded"></div>
                                <div className="absolute top-9 left-2 right-2 h-1 bg-cyan-700 rounded"></div>
                            </div>
                            {/* Braço com ferramenta */}
                            <div className="absolute top-16 -right-6 w-8 h-1 bg-gray-400 origin-left transform rotate-45 shadow">
                                <WrenchScrewdriverIcon className="absolute -right-1 -top-3 w-6 h-6 text-yellow-400 animate-wiggle" />
                            </div>
                        </div>
                    </div>

                    {/* Robô/Boneco Técnico Direito */}
                    <div className="absolute bottom-8 right-12 animate-bounce-subtle" style={{ animationDelay: '0.5s' }}>
                        <div className="relative">
                            {/* Cabeça */}
                            <div className="w-12 h-12 bg-gradient-to-b from-gray-300 to-gray-400 rounded-lg mb-1 relative shadow-lg">
                                <div className="absolute top-2 left-2 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                <div className="absolute top-2 right-2 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                                <div className="absolute bottom-2 left-3 right-3 h-1 bg-gray-600 rounded"></div>
                                {/* Antena */}
                                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-1 h-4 bg-gray-400"></div>
                                <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                            </div>
                            {/* Corpo */}
                            <div className="w-12 h-16 bg-gradient-to-b from-blue-500 to-blue-600 rounded shadow-lg relative">
                                <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                                <div className="absolute top-6 left-2 right-2 h-1 bg-blue-700 rounded"></div>
                                <div className="absolute top-9 left-2 right-2 h-1 bg-blue-700 rounded"></div>
                            </div>
                            {/* Braço levantado */}
                            <div className="absolute top-14 -left-6 w-8 h-1 bg-gray-400 origin-right transform -rotate-45 shadow">
                                <div className="absolute -left-2 -top-1 w-3 h-3 bg-yellow-400 rounded-sm animate-wiggle"></div>
                            </div>
                        </div>
                    </div>

                    {/* Partículas/Faíscas flutuantes */}
                    <div className="absolute top-10 left-1/3 w-2 h-2 bg-yellow-400 rounded-full animate-float-up"></div>
                    <div className="absolute top-20 right-1/3 w-2 h-2 bg-cyan-400 rounded-full animate-float-up" style={{ animationDelay: '0.5s' }}></div>
                    <div className="absolute top-5 left-1/2 w-1 h-1 bg-white rounded-full animate-float-up" style={{ animationDelay: '1s' }}></div>
                </div>

                {/* Mensagem */}
                <div className="text-center max-w-md">
                    <p className="text-white/90 text-lg mb-4">
                        Nossa equipe  está trabalhando para melhorar sua experiência!
                    </p>
                    <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm px-6 py-3 rounded-full border border-white/20">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-cyan-200 font-medium">Voltaremos em breve</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-12">
                    <Footer />
                </div>
            </div>

            <style jsx>{`
                @keyframes twinkle {
                    0%, 100% { opacity: 0.2; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.5); }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-20px); }
                }
                @keyframes float-up {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    100% { transform: translateY(-100px) scale(0); opacity: 0; }
                }
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes fade-in-delay {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                @keyframes spin-reverse {
                    from { transform: rotate(360deg); }
                    to { transform: rotate(0deg); }
                }
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
                @keyframes wiggle {
                    0%, 100% { transform: rotate(0deg); }
                    25% { transform: rotate(-15deg); }
                    75% { transform: rotate(15deg); }
                }
                @keyframes pulse-slow {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                .animate-twinkle {
                    animation: twinkle 3s ease-in-out infinite;
                }
                .animate-float {
                    animation: float 3s ease-in-out infinite;
                }
                .animate-float-up {
                    animation: float-up 3s ease-in-out infinite;
                }
                .animate-fade-in {
                    animation: fade-in 1s ease-out;
                }
                .animate-fade-in-delay {
                    animation: fade-in-delay 1.5s ease-out;
                }
                .animate-spin-slow {
                    animation: spin-slow 8s linear infinite;
                }
                .animate-spin-reverse {
                    animation: spin-reverse 6s linear infinite;
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s ease-in-out infinite;
                }
                .animate-wiggle {
                    animation: wiggle 1s ease-in-out infinite;
                }
                .animate-pulse-slow {
                    animation: pulse-slow 2s ease-in-out infinite;
                }
            `}</style>
        </div>
    )
}

export default Login