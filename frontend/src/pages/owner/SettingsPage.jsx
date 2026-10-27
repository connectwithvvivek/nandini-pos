import { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { authApi, dashboardApi } from '../../api'
import { useQueryClient } from '@tanstack/react-query'
import { Button } from '../../components/ui/Button'
import { Input, Textarea } from '../../components/ui/Input'
import { Badge } from '../../components/ui/Badge'
import { addToast } from '../../hooks/useToast'
import {
  User, Lock, Store, FileText, CheckCircle2,
  Shield, KeyRound, Sparkles, Building2, Phone, MapPin, Upload, Image, Trash2
} from 'lucide-react'

export default function SettingsPage() {
  const { user } = useAuth()
  const qc = useQueryClient()

  // Profile State
  const [fullName, setFullName] = useState(user?.full_name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  // Parlour / Store Settings (persisted locally and synced with backend for employees)
  const [storeInfo, setStoreInfo] = useState(() => {
    const saved = localStorage.getItem('nandini_store_info')
    if (saved) {
      try { return JSON.parse(saved) } catch {}
    }
    return {
      parlourName: 'NANDINI MILK PARLOUR',
      subBranch: 'Karnataka Milk Federation (KMF)',
      address: 'Shop #12, Commercial Complex, Main Road, Bangalore',
      phone: '+91 98765 43210',
      receiptFooter: 'Goods once sold cannot be returned. Thank you! Visit again!',
      shopLogo: '',
    }
  })

  useEffect(() => {
    dashboardApi.getStoreInfo().then(r => {
      if (r?.data) {
        setStoreInfo(r.data)
        try { localStorage.setItem('nandini_store_info', JSON.stringify(r.data)) } catch {}
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '')
      setPhone(user.phone || '')
    }
  }, [user])

  const [uploadingLogo, setUploadingLogo] = useState(false)

  // Handle Logo Upload to Supabase Storage
  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      addToast('Logo image must be smaller than 5MB', 'error')
      return
    }

    setUploadingLogo(true)
    const fd = new FormData()
    fd.append('logo', file)

    try {
      const res = await dashboardApi.uploadLogo(fd)
      const logoUrl = res.data?.shopLogo
      if (logoUrl) {
        const updated = { ...storeInfo, shopLogo: logoUrl }
        setStoreInfo(updated)
        localStorage.setItem('nandini_store_info', JSON.stringify(updated))
        window.dispatchEvent(new Event('storage'))
        qc.invalidateQueries(['store-info'])
        addToast('Shop logo uploaded to Supabase Storage and applied across all screens!')
      }
    } catch {
      // Graceful fallback to base64
      const reader = new FileReader()
      reader.onload = async () => {
        const base64 = reader.result
        const updated = { ...storeInfo, shopLogo: base64 }
        setStoreInfo(updated)
        localStorage.setItem('nandini_store_info', JSON.stringify(updated))
        window.dispatchEvent(new Event('storage'))
        try {
          await dashboardApi.updateStoreInfo(updated)
          qc.invalidateQueries(['store-info'])
        } catch {}
        addToast('Shop logo updated and applied across all screens!')
      }
      reader.readAsDataURL(file)
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleRemoveLogo = async () => {
    const updated = { ...storeInfo, shopLogo: '' }
    setStoreInfo(updated)
    localStorage.setItem('nandini_store_info', JSON.stringify(updated))
    window.dispatchEvent(new Event('storage'))
    try {
      await dashboardApi.updateStoreInfo(updated)
      qc.invalidateQueries(['store-info'])
    } catch {}
    addToast('Custom logo removed. Default brand emblem restored.')
  }

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSavingProfile(true)
    try {
      await authApi.updateMe({
        full_name: fullName.trim(),
        phone: phone.trim(),
      })
      addToast('Profile updated successfully!')
      const { data } = await authApi.me()
      if (user) Object.assign(user, data)
    } catch (err) {
      const data = err.response?.data
      addToast(data?.detail || 'Failed to update profile', 'error')
    } finally {
      setSavingProfile(false)
    }
  }

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (newPassword.length < 6) {
      addToast('New password must be at least 6 characters.', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      addToast('New password and confirm password do not match.', 'error')
      return
    }

    setSavingPassword(true)
    try {
      await authApi.updateMe({
        current_password: currentPassword,
        new_password: newPassword,
      })
      addToast('Password changed successfully!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const data = err.response?.data
      addToast(data?.detail || 'Failed to change password.', 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  // Handle Store Info Save
  const handleSaveStoreInfo = async (e) => {
    e.preventDefault()
    localStorage.setItem('nandini_store_info', JSON.stringify(storeInfo))
    window.dispatchEvent(new Event('storage'))
    try {
      await dashboardApi.updateStoreInfo(storeInfo)
      qc.invalidateQueries(['store-info'])
    } catch {}
    addToast('Parlour settings saved & updated across all screens!')
  }

  // EMPLOYEE VIEW: Simple profile with ONLY Password Change
  if (user?.role === 'EMPLOYEE') {
    return (
      <div className="max-w-md mx-auto px-3 sm:px-4 py-6 sm:py-8 space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 bg-green-100 text-green-700 font-black text-2xl rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            {user?.full_name?.[0]?.toUpperCase() || 'E'}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{user?.full_name}</h1>
          <p className="text-xs text-gray-500 font-mono">@{user?.username} · Cashier</p>
          <div className="pt-1">
            <Badge variant="success">Account Active</Badge>
          </div>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Change Password</h2>
              <p className="text-xs text-gray-400">Update your cashier login password</p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              required
            />
            <Input
              label="New Password *"
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="At least 6 characters"
            />
            <Input
              label="Confirm New Password *"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Re-enter new password"
            />
            <Button type="submit" disabled={savingPassword} className="w-full py-3 font-bold">
              {savingPassword ? 'Updating Password...' : 'Save New Password'}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // OWNER VIEW: Full profile, parlour configuration, and Shop Logo upload
  return (
    <div className="max-w-5xl mx-auto space-y-6 px-3 sm:px-4 md:px-6 py-4 md:py-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings & Parlour Customization</h1>
        <p className="text-sm text-gray-500">Configure parlour logo, store receipt information, and owner credentials</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Personal Profile & Password */}
        <div className="space-y-6">
          {/* Shop Logo Customizer */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                <Image className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Shop Logo</h2>
                <p className="text-xs text-gray-400">Upload custom parlour logo to fit on the menu bar & receipts</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                {storeInfo.shopLogo ? (
                  <img src={storeInfo.shopLogo} alt="Shop Logo" className="w-full h-full object-contain p-1" />
                ) : (
                  <Store className="w-8 h-8 text-gray-300" />
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer bg-green-50 text-green-700 hover:bg-green-100 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {storeInfo.shopLogo && (
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      title="Reset to default emblem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400">PNG, JPG, or SVG up to 2MB. Auto-scales to fit the header menu bar perfectly.</p>
              </div>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-2xl bg-green-100 text-green-700 font-bold flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Owner Profile</h2>
                <p className="text-xs text-gray-400">Update your name and contact phone</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400">Username</span>
                  <p className="font-mono font-bold text-gray-900 text-sm">@{user?.username}</p>
                </div>
                <div>
                  <span className="text-gray-400">Assigned Role</span>
                  <div>
                    <Badge variant="purple">
                      {user?.role}
                    </Badge>
                  </div>
                </div>
              </div>

              <Input
                label="Full Name *"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                required
                placeholder="e.g. Ramesh Kumar"
              />

              <Input
                label="Phone Number"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="9876543210"
              />

              <Button type="submit" disabled={savingProfile} className="w-full">
                {savingProfile ? 'Saving...' : 'Update Profile Info'}
              </Button>
            </form>
          </div>

          {/* Change Password Card */}
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 font-bold flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Change Password</h2>
                <p className="text-xs text-gray-400">Keep your account secure with a strong password</p>
              </div>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />

              <Input
                label="New Password *"
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="At least 6 characters"
              />

              <Input
                label="Confirm New Password *"
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                placeholder="Re-enter new password"
              />

              <Button type="submit" disabled={savingPassword} variant="secondary" className="w-full">
                {savingPassword ? 'Changing Password...' : 'Save New Password'}
              </Button>
            </form>
          </div>
        </div>

        {/* Right Column: Store & Receipt Configuration */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">Parlour & Receipt Details</h2>
                <p className="text-xs text-gray-400">Displayed on bill receipts and top headers</p>
              </div>
            </div>

            <form onSubmit={handleSaveStoreInfo} className="space-y-4">
              <Input
                label="Shop / Parlour Name *"
                value={storeInfo.parlourName}
                onChange={e => setStoreInfo({ ...storeInfo, parlourName: e.target.value })}
                required
                placeholder="e.g. NANDINI MILK PARLOUR"
              />

              <Input
                label="Sub-branch / Tagline"
                value={storeInfo.subBranch}
                onChange={e => setStoreInfo({ ...storeInfo, subBranch: e.target.value })}
                placeholder="e.g. Karnataka Milk Federation (KMF)"
              />

              <Textarea
                label="Store Address"
                value={storeInfo.address}
                onChange={e => setStoreInfo({ ...storeInfo, address: e.target.value })}
                rows={2}
                placeholder="Full address printed on receipt"
              />

              <Input
                label="Contact Phone"
                value={storeInfo.phone}
                onChange={e => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />

              <Input
                label="Receipt Footer Note"
                value={storeInfo.receiptFooter}
                onChange={e => setStoreInfo({ ...storeInfo, receiptFooter: e.target.value })}
                placeholder="e.g. Goods once sold cannot be returned. Thank you!"
              />

              <Button type="submit" className="w-full py-3 font-bold">
                Save Parlour Details & Update Menu
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
