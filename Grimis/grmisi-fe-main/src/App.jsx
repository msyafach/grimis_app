import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom'
import { router } from './route/router'
import 'react-quill/dist/quill.snow.css';
import 'react-circular-progressbar/dist/styles.css';
import "react-perfect-scrollbar/dist/css/styles.css";
import "react-datepicker/dist/react-datepicker.css";
import "react-datetime/css/react-datetime.css";
import NavigationProvider from './contentApi/navigationProvider';
import SideBarToggleProvider from './contentApi/sideBarToggleProvider';
import ThemeCustomizer from './components/shared/ThemeCustomizer';
import { AuthProvider } from './context/AuthContext';
import { InstansiProvider } from './context/InstansiContext';
import { IndukUnitKerjaProvider } from './context/IndukUnitKerjaContext';
import { TahunProvider } from './context/TahunContext';
import { LanguageProvider } from './context/LanguageContext';
import { AppLoadingProvider } from './context/AppLoadingContext';
import { initializeTheme } from './utils/themeSettings';

const App = () => {
  useEffect(() => {
    initializeTheme();
  }, []);

  return (
    <>
      <AppLoadingProvider>
        <LanguageProvider>
          <InstansiProvider>
            <TahunProvider>
              <IndukUnitKerjaProvider>


                <AuthProvider>
                  <NavigationProvider>
                    <SideBarToggleProvider>
                      <RouterProvider router={router} />
                    </SideBarToggleProvider>
                  </NavigationProvider>
                </AuthProvider>
              </IndukUnitKerjaProvider>

            </TahunProvider>
          </InstansiProvider>
        </LanguageProvider>
      </AppLoadingProvider>
    </>
  )
}

export default App