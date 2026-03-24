import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "@/components/Layout";
import Products from "./pages/Products";
import Ingredients from "./pages/Ingredients";
import Auth from "./pages/Auth";
import ProductDetail from "./pages/ProductDetail";
import IngredientDetail from "./pages/IngredientDetail";
import Suppliers from "./pages/Suppliers";
import Manufacturers from "./pages/Manufacturers";
import ProductFormPage from "./pages/ProductForm";
import IngredientFormPage from "./pages/IngredientForm";
import SupplierFormPage from "./pages/SupplierForm";
import ManufacturerFormPage from "./pages/ManufacturerForm";
import SupplierDetail from "./pages/SupplierDetail";
import ManufacturerDetail from "./pages/ManufacturerDetail";
import Users from "./pages/Users";
import Procurement from "./pages/Procurement";
import OrderLog from "./pages/OrderLog";
import ScheduledExports from "./pages/ScheduledExports";
import IngredientStockLevels from "./pages/reports/IngredientStockLevels";
import StartupProjectCompletion from "./pages/reports/StartupProjectCompletion";
import Settings from "./pages/Settings";
import MySubscriptions from "./pages/MySubscriptions";
import BatchUpload from "./pages/BatchUpload";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Products />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProductFormPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:id/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProductFormPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/products/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ProductDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ingredients/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <IngredientFormPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ingredients/:id/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <IngredientFormPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ingredients/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <IngredientDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/ingredients"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Ingredients />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SupplierFormPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers/:id/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SupplierFormPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <SupplierDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/suppliers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Suppliers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manufacturers/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ManufacturerFormPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manufacturers/:id/edit"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ManufacturerFormPage />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manufacturers/:id"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ManufacturerDetail />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/manufacturers"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Manufacturers />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/procurement"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Procurement />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/order-log"
              element={
                <ProtectedRoute>
                  <Layout>
                    <OrderLog />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Users />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/scheduled-exports"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ScheduledExports />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/ingredient-stock-levels"
              element={
                <ProtectedRoute>
                  <Layout>
                    <IngredientStockLevels />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports/startup-project-completion"
              element={
                <ProtectedRoute>
                  <Layout>
                    <StartupProjectCompletion />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-subscriptions"
              element={
                <ProtectedRoute>
                  <Layout>
                    <MySubscriptions />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/batch-upload"
              element={
                <ProtectedRoute>
                  <Layout>
                    <BatchUpload />
                  </Layout>
                </ProtectedRoute>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
