import { useContext, useEffect } from 'react';
import { AuthContextApi } from '../../Context/api';
import { jsonConfig } from '../../Config';
import Header from '../../Components/Header';
import CardActions from '../../Components/Cards/Actions';
import NavMenu from '../../Components/NavMenu/Tecnico';
import {
    WrenchScrewdriverIcon,
    ExclamationTriangleIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline'


const UsuariosIndex = () => {
    const { checkLogin } = useContext(AuthContextApi)

    const primeiroLoad = async () => {
        if (jsonConfig.uiMock) return
        await checkLogin()
    }

    useEffect(() => {
        primeiroLoad()
    }, [])

    const cardActions = [
        {
            id: 1,
            title: 'Sistema de Logs',
            description: 'Monitoramento e análise de eventos, erros e atividades do sistema',
            icon: ExclamationTriangleIcon,
            href: '/tecnicoIndex/logs',
        },
        {
            id: 2,
            title: 'Requests do Sistema',
            description: 'Histórico e análise das requisições da API',
            icon: DocumentTextIcon,
            href: '/tecnicoIndex/requests',
        },
    ]

    return (
        <div>
            <Header
                title="Painel Técnico"
                description="Ferramentas técnicas e administrativas do sistema"
                icon={WrenchScrewdriverIcon}
            />
            <div className="p-6">
                <NavMenu />
                <div className="bg-brand-tip rounded-brand px-4 py-3 text-xs text-brand-slate mb-4">
                    Área restrita para diagnóstico: logs de exceção e tráfego de requests da API.
                </div>
                <CardActions actions={cardActions} />
            </div>
        </div>
    )
}



export default UsuariosIndex;
