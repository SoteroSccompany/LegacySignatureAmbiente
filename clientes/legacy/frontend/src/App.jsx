import { BrowserRouter } from 'react-router-dom';
import Router from './Router';
import AuthProvider from './Context/index';
import AuthProviderApi from './Context/api';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import ModalInformacao from './Components/Modal/msgData'
import SpinnerOverlay from './Components/SpinnerOverlay';
import { jsonConfig } from './Config';
import Manutencao from './Views/Manutencao';


function App() {
  if (jsonConfig.manutencao) {
    return (
      <div className='notranslate overflow-x-hidden max-w-full'>
        <Manutencao />
      </div>
    );
  }

  return (
    <div className='notranslate overflow-x-hidden max-w-full'>
      <AuthProvider>
        <AuthProviderApi>
          <BrowserRouter>
            <ToastContainer />
            <ModalInformacao />
            <SpinnerOverlay />
            <Router />
          </BrowserRouter>
        </AuthProviderApi>
      </AuthProvider>
    </div>

  );
}

export default App;