import axios from 'axios'

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '')

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, { refresh })
          localStorage.setItem('access_token', data.access)
          original.headers.Authorization = `Bearer ${data.access}`
          return api(original)
        } catch {
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api

// Auth
export const authApi = {
  login: (data) => api.post('/auth/login/', data),
  logout: (refresh) => api.post('/auth/logout/', { refresh }),
  me: () => api.get('/auth/me/'),
  updateMe: (data) => api.patch('/auth/me/', data),
  employees: () => api.get('/auth/employees/'),
  createEmployee: (data) => api.post('/auth/employees/', data),
  updateEmployee: (id, data) => api.patch(`/auth/employees/${id}/`, data),
}

// Customers
export const customersApi = {
  list: (params) => api.get('/customers/', { params }),
  get: (id) => api.get(`/customers/${id}/`),
  create: (data) => api.post('/customers/', data),
  update: (id, data) => api.patch(`/customers/${id}/`, data),
}

// Products
export const productsApi = {
  list: (params) => api.get('/products/', { params }),
  get: (id) => api.get(`/products/${id}/`),
  create: (data) => api.post('/products/', data),
  update: (id, data) => api.patch(`/products/${id}/`, data),
  delete: (id) => api.delete(`/products/${id}/`),
  uploadImage: (id, formData) => api.post(`/products/${id}/upload-image/`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  categories: () => api.get('/products/categories/'),
  createCategory: (data) => api.post('/products/categories/', data),
}

// Pricing
export const pricingApi = {
  getCustomerPrices: (customerId) => api.get(`/pricing/customers/${customerId}/prices/`),
  updateCustomerPrice: (customerId, data) => api.patch(`/pricing/customers/${customerId}/prices/`, data),
  getCustomerProducts: (customerId) => api.get(`/pricing/customers/${customerId}/products/`),
  history: (params) => api.get('/pricing/history/', { params }),
}

// Sales & Credit
export const salesApi = {
  list: (params) => api.get('/sales/', { params }),
  create: (data) => api.post('/sales/create/', data),
  get: (id) => api.get(`/sales/${id}/`),
  cancel: (id) => api.post(`/sales/${id}/cancel/`),
  customerSales: (customerId, params) => api.get(`/sales/customer/${customerId}/`, { params }),
}

export const creditApi = {
  summary: (params) => api.get('/sales/credit/summary/', { params }),
  bills: (params) => api.get('/sales/credit/bills/', { params }),
  billDetail: (id) => api.get(`/sales/credit/bills/${id}/`),
  payBill: (id, data) => api.post(`/sales/credit/bills/${id}/pay/`, data),
  customerLedger: (customerId) => api.get(`/sales/credit/customer/${customerId}/`),
  outstandingCustomers: () => api.get('/sales/credit/customers/'),
  payments: (params) => api.get('/sales/credit/payments/', { params }),
}

// Shifts
export const shiftsApi = {
  list: () => api.get('/shifts/'),
  create: (data) => api.post('/shifts/', data),
  update: (id, data) => api.patch(`/shifts/${id}/`, data),
  open: (data) => api.post('/shifts/open/', data),
  close: (data) => api.post('/shifts/close/', data),
  current: () => api.get('/shifts/current/'),
  employeeShifts: (params) => api.get('/shifts/employee-shifts/', { params }),
}

// Inventory
export const inventoryApi = {
  list: (params) => api.get('/inventory/', { params }),
  adjust: (data) => api.post('/inventory/adjust/', data),
  productHistory: (productId) => api.get(`/inventory/products/${productId}/history/`),
}

// Dashboard
export const dashboardApi = {
  today: () => api.get('/dashboard/today/'),
  reports: (params) => api.get('/dashboard/reports/', { params }),
  getStoreInfo: () => api.get('/dashboard/store-info/'),
  updateStoreInfo: (data) => api.post('/dashboard/store-info/', data),
  uploadLogo: (formData) => api.post('/dashboard/store-info/logo/', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}
