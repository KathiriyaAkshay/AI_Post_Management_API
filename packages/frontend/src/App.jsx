import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider } from 'react-redux';
import { store } from './store/store';
import { loadFromStorage } from './store/slices/authSlice';
import Login from './pages/Login';

import Dashboard from './pages/Dashboard';
import ClientList from './pages/Clients/ClientList';
import ClientForm from './pages/Clients/ClientForm';
import PromptManagement from './pages/Prompts/PromptManagement';
import CampaignList from './pages/Campaigns/CampaignList';
import CampaignForm from './pages/Campaigns/CampaignForm';
import CampaignOptionsList from './pages/CampaignOptions/CampaignOptionsList';
import ImageGenerationAdmin from './pages/ImageGeneration/ImageGenerationAdmin';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './components/MainLayout';
import './styles/main.scss';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  useEffect(() => {
    store.dispatch(loadFromStorage());
  }, []);

  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider
          theme={{
            token: {
              colorPrimary: '#4f46e5',
            },
          }}
        >
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <Dashboard />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ClientList />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/new"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ClientForm />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ClientForm />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/clients/:customerId/prompts"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <PromptManagement />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campaigns"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <CampaignList />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campaigns/new"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <CampaignForm />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campaigns/:id"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <CampaignForm />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/campaign-options"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <CampaignOptionsList />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/image-generation"
                element={
                  <ProtectedRoute>
                    <MainLayout>
                      <ImageGenerationAdmin />
                    </MainLayout>
                  </ProtectedRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </BrowserRouter>
        </ConfigProvider>
      </QueryClientProvider>
    </Provider>
  );
}

export default App;
