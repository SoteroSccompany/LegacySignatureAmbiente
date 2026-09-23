import { createContext, useContext } from "react";
import { AuthContext } from ".";
import { toast } from 'react-toastify';
import { conection, clearLocalSession } from '../utils/index'
import { jsonConfig } from '../Config';
import { clearMockSession } from '../mocks';


export const AuthContextApi = createContext();


const AuthProvider = ({ children }) => {

    const { states, setters } = useContext(AuthContext);
    const axiosAuth = conection.auth();
    const axiosNoAuth = conection.noAuth();

    const handleAuthError = (err) => {
        if (err?.response?.status === 403 || err?.response?.status === 401) {
            clearLocalSession()
            setters.setSigned(false)
            return true;
        }
        return false;
    }

    const checkLogin = async () => {
        if (jsonConfig.uiMock) {
            const token = localStorage.getItem('token')
            if (token && token !== 'mock-ui-partial') {
                setters.setSigned(true)
                return true
            }
            setters.setSigned(false)
            return false
        }
        try {
            const response = await axiosAuth.get('/user/check')
            const flag = response?.data?.biometria_obrigatoria === true
            localStorage.setItem('biometriaObrigatoria', flag ? 'true' : 'false')
            setters.setBiometriaObrigatoria(flag)
            return true;
        } catch (err) {
            console.log(err)
            if (!handleAuthError(err)) {
                toast.error(err?.response?.data?.msg || 'Erro ao verificar login')
            }
            return false
        }
    }

    const logout = async () => {
        if (jsonConfig.uiMock) {
            clearMockSession()
            setters.setSigned(false)
            return true
        }
        setters.setIsLoading(true)
        try {
            await axiosAuth.get('/user/logOut')
        } catch (err) {
            console.log(err)
        }
        setters.setIsLoading(false)
        clearLocalSession()
        setters.setBiometriaObrigatoria(false)
        setters.setSigned(false)
        return true;
    }

    const forgotPass = async (data) => {
        setters.setIsLoading(true)
        try {
            await axiosNoAuth.post('/user/forgotPassword', data)
            setters.setIsLoading(false)
            return true;
        } catch (err) {
            setters.setIsLoading(false)
            toast.error(err?.response?.data?.msg || 'Erro ao solicitar recuperação')
            return false;
        }
    }

    const forgotChangePass = async (data) => {
        setters.setIsLoading(true)
        try {
            await axiosNoAuth.post('/user/forgotChangePass', data)
            setters.setIsLoading(false)
            return true;
        } catch (err) {
            setters.setIsLoading(false)
            toast.error(err?.response?.data?.msg || 'Erro ao redefinir senha')
            return false;
        }
    }

    //#region técnico: logs e requests

    const getLogsDataSistema = async () => {
        setters.setIsLoading(true)
        try {
            const response = await axiosAuth.get('/dadosSistema/logs')
            setters.setIsLoading(false)
            setters.setDataEstatisticaLogs(response.data.data)
        } catch (err) {
            setters.setIsLoading(false)
            if (!handleAuthError(err)) toast.error(err?.response?.data?.msg || 'Erro ao carregar métricas de logs')
        }
    }

    const getLogsMetricas = async () => {
        // métricas de logs vêm do mesmo dataset do dadosSistema
        return getLogsDataSistema();
    }

    const getLogs = async (query) => {
        setters.setIsLoading(true)
        try {
            const response = await axiosAuth.get(`/logs?${query}`)
            setters.setIsLoading(false)
            setters.setDataLogs(response.data.data)
        } catch (err) {
            setters.setIsLoading(false)
            if (!handleAuthError(err)) {
                if (states.page > 0) setters.setPage(states.page - 1)
                toast.error(err?.response?.data?.msg || 'Erro ao carregar logs')
            }
        }
    }

    const getRequestsMetricas = async () => {
        setters.setIsLoading(true)
        try {
            const response = await axiosAuth.get('/requests/metrics')
            setters.setIsLoading(false)
            setters.setDataEstatisticaRequests(response.data.data)
        } catch (err) {
            setters.setIsLoading(false)
            if (!handleAuthError(err)) toast.error(err?.response?.data?.msg || 'Erro ao carregar métricas de requests')
        }
    }

    const getRequestsDataSistema = async () => {
        return getRequestsMetricas();
    }

    const getRequests = async (query) => {
        setters.setIsLoading(true)
        try {
            const response = await axiosAuth.get(`/requests?${query}`)
            setters.setIsLoading(false)
            setters.setDataRequests(response.data.data)
        } catch (err) {
            setters.setIsLoading(false)
            if (!handleAuthError(err)) toast.error(err?.response?.data?.msg || 'Erro ao carregar requests')
        }
    }

    //#endregion

    //#region dashboard e usuários

    const getDashBoardataSistema = async () => {
        setters.setIsLoading(true)
        try {
            const response = await axiosAuth.get(`/dadosSistema/dashBoard`)
            setters.setIsLoading(false)
            return response.data
        } catch (err) {
            console.log(err)
            setters.setIsLoading(false)
            if (!handleAuthError(err)) toast.error(err?.response?.data?.msg || 'Erro ao carregar dashboard')
            return { status: false };
        }
    }

    const getUsuariosDataSistema = async () => {
        setters.setIsLoading(true)
        try {
            const response = await axiosAuth.get('/dadosSistema/usuarios')
            setters.setIsLoading(false)
            setters.setDataEstatisticaUsuarios(response.data.data)
        } catch (err) {
            setters.setIsLoading(false)
            if (!handleAuthError(err)) toast.error(err?.response?.data?.msg || 'Erro ao carregar métricas de usuários')
        }
    }

    const getUsuarios = async (query) => {
        setters.setIsLoading(true)
        try {
            const response = await axiosAuth.get(`/user?${query || ''}`)
            setters.setIsLoading(false)
            setters.setDataUsuarios(response.data.data)
            return response.data.data;
        } catch (err) {
            setters.setIsLoading(false)
            if (!handleAuthError(err)) toast.error(err?.response?.data?.msg || 'Erro ao carregar usuários')
            return false;
        }
    }

    const getUsuariosQuery = async (query) => {
        return getUsuarios(query);
    }

    const postUsuarios = async (data) => {
        setters.setIsLoading(true)
        try {
            await axiosAuth.post('/user/create', data)
            setters.setIsLoading(false)
            toast.success('Usuário criado. As orientações de acesso foram enviadas por e-mail.')
            return true;
        } catch (err) {
            setters.setIsLoading(false)
            if (!handleAuthError(err)) toast.error(err?.response?.data?.msg || 'Erro ao criar usuário')
            return false;
        }
    }

    const putRoleUsuarios = async (id, data) => {
        setters.setIsLoading(true)
        try {
            await axiosAuth.patch(`/user/role/${id}`, data)
            setters.setIsLoading(false)
            toast.success('Permissão atualizada com sucesso')
            return true;
        } catch (err) {
            setters.setIsLoading(false)
            if (!handleAuthError(err)) toast.error(err?.response?.data?.msg || 'Erro ao atualizar permissão')
            return false;
        }
    }

    const blockUnlockUsuarios = async (id, status) => {
        setters.setIsLoading(true)
        try {
            await axiosAuth.patch(`/user/blockUnlock/${id}`, { noData: "data" })
            setters.setIsLoading(false)
            toast.success(status ? 'Usuário desbloqueado com sucesso' : 'Usuário bloqueado com sucesso')
            return true;
        } catch (err) {
            setters.setIsLoading(false)
            if (!handleAuthError(err)) toast.error(err?.response?.data?.msg || 'Erro ao alterar bloqueio')
            return false;
        }
    }

    const deleteUsuarios = async (id) => {
        setters.setIsLoading(true)
        try {
            await axiosAuth.delete(`/user/${id}`)
            setters.setIsLoading(false)
            toast.success('Usuário deletado com sucesso')
            return true;
        } catch (err) {
            console.log(err)
            setters.setIsLoading(false)
            if (!handleAuthError(err)) toast.error(err?.response?.data?.msg || 'Erro ao deletar usuário')
            return false;
        }
    }

    //#endregion


    return (
        <AuthContextApi.Provider
            value={{
                checkLogin,
                logout,
                forgotPass,
                forgotChangePass,
                getLogsDataSistema,
                getLogsMetricas,
                getLogs,
                getRequestsDataSistema,
                getRequestsMetricas,
                getRequests,
                getDashBoardataSistema,
                getUsuariosDataSistema,
                getUsuarios,
                getUsuariosQuery,
                postUsuarios,
                putRoleUsuarios,
                blockUnlockUsuarios,
                deleteUsuarios,
            }}>
            {children}
        </AuthContextApi.Provider>
    )
}

export default AuthProvider;
