import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { supabase, API_URL } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  /** Busca o perfil (tabela profiles) do usuário logado. */
  const fetchProfile = useCallback(async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error) setProfile(data)
    return data || null
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session?.user) fetchProfile(data.session.user.id)
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) fetchProfile(newSession.user.id)
      else setProfile(null)
    })
    return () => sub.subscription.unsubscribe()
  }, [fetchProfile])

  // ------------------------------------------------------------------ ações

  const signIn = useCallback(
    async (email, password) =>
      (await supabase.auth.signInWithPassword({ email, password })).error || null
  )

  const signUp = useCallback(async (email, password, fullName, cargo) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, cargo: cargo || 'Operador' },
        emailRedirectTo: window.location.origin,
      },
    })
    return error || null
  })

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setProfile(null)
  })

  const updateProfile = useCallback(async ({ full_name, cargo }) => {
    if (!session?.user) return 'Sem sessão ativa'
    const { error } = await supabase
      .from('profiles')
      .update({ full_name, cargo })
      .eq('id', session.user.id)
    if (error) return error.message
    setProfile((p) => ({ ...p, full_name, cargo }))
    return null
  })

  /** Upload da foto de perfil para o bucket "avatars" e update da URL. */
  const uploadAvatar = useCallback(
    async (file) => {
      if (!session?.user) return 'Sem sessão ativa'
      const userId = session.user.id
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${userId}/avatar.${ext}` // pasta própria = permitido pelo RLS

      // Reaproveita a mesma pasta: remove versão antiga p/ evitar cache
      await supabase.storage.from('avatars').remove([path])

      const { error: upError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { cacheControl: '0', upsert: true })
      if (upError) return upError.message

      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      const url = `${data.publicUrl}?t=${Date.now()}` // busta o cache do browser

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', userId)
      if (dbError) return dbError.message

      setProfile((p) => ({ ...p, avatar_url: url }))
      return null
    },
    [session]
  )

  /** Header Authorization para chamadas ao BFF (rota SuperAdmin). */
  const getAuthHeader = useCallback(
    async () => ({ Authorization: `Bearer ${(await supabase.auth.getSession()).data.session.access_token}` }),
    []
  )

  const isAdmin = profile?.role === 'superadmin'

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      profile,
      loading,
      isAdmin,
      signIn,
      signUp,
      signOut,
      updateProfile,
      uploadAvatar,
      getAuthHeader,
      API_URL,
    }),
    [session, profile, loading, isAdmin, signIn, signUp, signOut, updateProfile, uploadAvatar, getAuthHeader]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de <AuthProvider>')
  return ctx
}
