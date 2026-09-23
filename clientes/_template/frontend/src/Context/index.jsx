import { createContext, useState } from "react";
import { jsonConfig } from '../Config';

export const AuthContext = createContext();

const AuthProvider = ({ children }) => {

    const [signed, setSigned] = useState(false)
    const [biometriaObrigatoria, setBiometriaObrigatoria] = useState(localStorage.getItem('biometriaObrigatoria') === 'true')
    const [isLoading, setIsLoading] = useState(false)

    const [email, setEmail] = useState('')
    const [senha, setSenha] = useState('')

    const [modalMsg, setModalMsg] = useState(false)
    const [msgModalMsg, setMsgModalMsg] = useState('')
    const [descModalMsg, setDescModalMsg] = useState('')
    const [titleButtonModalMsg, setTitleButtonModalMsg] = useState('Retornar')
    const [titleButtonCloseModalMsg, setTitleButtonCloseModalMsg] = useState('Fechar')
    const [perigoModalMsg, setPerigoModalMsg] = useState(false)
    const [functionModalMsg, setFunctionModalMsg] = useState(() => { })

    const [sideBar, setSideBar] = useState(false)

    //Page, per_page, sort, sort_dir, filter
    const [page, setPage] = useState(0)
    const [per_page, setPer_page] = useState(jsonConfig.limitDefault)
    const [sort, setSort] = useState("data_criacao")
    const [sort_dir, setSort_dir] = useState("desc")
    const [filter, setFilter] = useState(null)

    const [dataEstatisticaLogs, setDataEstatisticaLogs] = useState([])
    const [dataLogs, setDataLogs] = useState([])
    const [Logs, setLogs] = useState({})
    const [offsetLogs, setOffsetLogs] = useState(0)
    const [limiteLogs, setLimiteLogs] = useState(jsonConfig.limitDefault)
    const [limiteBuscaLogs, setLimiteBuscaLogs] = useState(false)
    const [modalLogs, setModalLogs] = useState(false)

    const [dataEstatisticaRequests, setDataEstatisticaRequests] = useState([])
    const [dataRequests, setDataRequests] = useState([])
    const [Requests, setRequests] = useState({})
    const [offsetRequests, setOffsetRequests] = useState(0)
    const [limiteRequests, setLimiteRequests] = useState(jsonConfig.limitDefault)
    const [limiteBuscaRequests, setLimiteBuscaRequests] = useState(false)
    const [modalRequests, setModalRequests] = useState(false)

    const states = {
        // Paginação e filtros
        page,
        per_page,
        sort,
        sort_dir,
        filter,
        // Requests
        dataEstatisticaRequests,
        dataRequests,
        Requests,
        offsetRequests,
        limiteRequests,
        limiteBuscaRequests,
        modalRequests,
        // Logs
        dataEstatisticaLogs,
        dataLogs,
        Logs,
        offsetLogs,
        limiteLogs,
        limiteBuscaLogs,
        modalLogs,
        // Estados gerais
        signed,
        biometriaObrigatoria,
        isLoading,
        email,
        senha,
        modalMsg,
        msgModalMsg,
        descModalMsg,
        perigoModalMsg,
        titleButtonModalMsg,
        functionModalMsg,
        titleButtonCloseModalMsg,
        sideBar,
    }

    const setters = {
        // Paginação e filtros
        setPage,
        setPer_page,
        setSort,
        setSort_dir,
        setFilter,
        // Requests
        setDataEstatisticaRequests,
        setDataRequests,
        setRequests,
        setOffsetRequests,
        setLimiteRequests,
        setLimiteBuscaRequests,
        setModalRequests,
        // Logs
        setDataEstatisticaLogs,
        setDataLogs,
        setLogs,
        setOffsetLogs,
        setLimiteLogs,
        setLimiteBuscaLogs,
        setModalLogs,
        // Estados gerais
        setSigned,
        setBiometriaObrigatoria,
        setIsLoading,
        setEmail,
        setSenha,
        setModalMsg,
        setMsgModalMsg,
        setDescModalMsg,
        setPerigoModalMsg,
        setTitleButtonModalMsg,
        setFunctionModalMsg,
        setTitleButtonCloseModalMsg,
        setSideBar,
    }

    return (
        <AuthContext.Provider
            value={{
                states,
                setters
            }}>
            {children}
        </AuthContext.Provider>
    )
}

export default AuthProvider;
