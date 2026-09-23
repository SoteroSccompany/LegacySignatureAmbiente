import { useContext } from 'react'
import { AuthContext } from "../../Context/index"
import { useLocation } from 'react-router-dom'

export default function SpinnerOverlay() {
    const {states} = useContext(AuthContext)
    const location = useLocation()
    

    if(location.pathname !== '/'){
        return (
            <div
                // className='flex flex-1 flex-col md:pl-64'
                hidden={states.isLoading === false ? true : false}
                style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    zIndex: 9999,
                }}
            >
                <div className="flex justify-center items-center h-screen">
                    <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-blue-500 border-solid"></div>
                </div>
    
            </div>
        )
    }

  }