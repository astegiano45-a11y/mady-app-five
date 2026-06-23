import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Alert,
  TextInput, Animated, Image, RefreshControl, KeyboardAvoidingView,
  Platform, Modal, ScrollView, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Heart, MessageCircle, Camera, X, Send, ChevronDown } from 'lucide-react-native';
import { C } from '../theme/colors';
import { R, S } from '../theme/spacing';
import { T } from '../theme/typography';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';

const CATEGORIES = [
  { key: 'general',  label: 'General',          emoji: '💬' },
  { key: 'cuidado',  label: 'Cuidado responsable', emoji: '🐾' },
  { key: 'salud',    label: 'Salud',             emoji: '💊' },
  { key: 'adopcion', label: 'Adopción',          emoji: '❤️' },
  { key: 'humor',    label: 'Humor',             emoji: '😄' },
];

const CAT_COLORS = {
  general:  C.teal,
  cuidado:  C.found,
  salud:    '#3B82F6',
  adopcion: C.coral,
  humor:    '#F59E0B',
};

function formatTime(iso) {
  const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (diff < 1)    return 'ahora';
  if (diff < 60)   return `${diff} min`;
  if (diff < 1440) return `${Math.floor(diff / 60)} h`;
  return `${Math.floor(diff / 1440)} días`;
}

async function uploadPostPhoto(uri, base64) {
  const path = `posts/${Date.now()}.jpg`;
  if (Platform.OS === 'web' || base64) {
    const byteChars = atob(base64);
    const bytes = new Uint8Array(byteChars.length).map((_, i) => byteChars.charCodeAt(i));
    const blob = new Blob([bytes], { type: 'image/jpeg' });
    await supabase.storage.from('mascotas').upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  } else {
    const resp = await fetch(uri);
    const blob = await resp.blob();
    await supabase.storage.from('mascotas').upload(path, blob, { upsert: true });
  }
  return supabase.storage.from('mascotas').getPublicUrl(path).data.publicUrl;
}

// ── Mini modal de confirmación ────────────────────────────────────────────────
function ConfirmModal({ visible, message, onConfirm, onCancel, confirmLabel = 'Eliminar', confirmColor = C.lost }) {
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={cm.backdrop} activeOpacity={1} onPress={onCancel}>
        <View style={cm.box}>
          <Text style={cm.msg}>{message}</Text>
          <View style={cm.row}>
            <TouchableOpacity style={cm.cancelBtn} onPress={onCancel}>
              <Text style={cm.cancelTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[cm.confirmBtn, { backgroundColor: confirmColor }]} onPress={onConfirm}>
              <Text style={cm.confirmTxt}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}
const cm = StyleSheet.create({
  backdrop:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 32 },
  box:        { backgroundColor: C.white, borderRadius: R['2xl'], padding: S[24], width: '100%', maxWidth: 340 },
  msg:        { fontSize: T.base, color: C.ink, marginBottom: S[20], lineHeight: 22, textAlign: 'center' },
  row:        { flexDirection: 'row', gap: 10 },
  cancelBtn:  { flex: 1, paddingVertical: 12, borderRadius: R.xl, borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  cancelTxt:  { fontSize: T.sm, fontWeight: '700', color: C.inkMid },
  confirmBtn: { flex: 1, paddingVertical: 12, borderRadius: R.xl, alignItems: 'center' },
  confirmTxt: { fontSize: T.sm, fontWeight: '700', color: C.white },
});

// ── Modal de comentarios ──────────────────────────────────────────────────────
function CommentsModal({ visible, post, currentUser, onClose }) {
  const [comments,  setComments]  = useState([]);
  const [text,      setText]      = useState('');
  const [sending,   setSending]   = useState(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const load = async () => {
    if (!post) return;
    const { data } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true });
    if (data && mounted.current) {
      const userIds = [...new Set(data.map(c => c.user_id))];
      const { data: profiles } = await supabase.from('profiles').select('id, name').in('id', userIds);
      const pm = {};
      if (profiles) profiles.forEach(p => { pm[p.id] = p; });
      setComments(data.map(c => ({ ...c, author_name: pm[c.user_id]?.name || 'Usuario' })));
    }
  };

  useEffect(() => { if (visible) load(); }, [visible, post?.id]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('profiles').upsert({
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
    }, { onConflict: 'id', ignoreDuplicates: true });
    await supabase.from('post_comments').insert({ post_id: post.id, user_id: user.id, content: text.trim() });
    setText('');
    setSending(false);
    load();
  };

  const deleteComment = async (cid) => {
    setComments(prev => prev.filter(c => c.id !== cid));
    await supabase.from('post_comments').delete().eq('id', cid);
  };

  const name    = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'Vos';
  const initials = (name || 'U')[0].toUpperCase();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={comt.container}>
          {/* Header */}
          <View style={comt.header}>
            <TouchableOpacity onPress={onClose} style={comt.closeBtn}>
              <X size={20} color={C.ink} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={comt.title}>Comentarios {comments.length > 0 ? `· ${comments.length}` : ''}</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Post resumido */}
          {post && (
            <View style={comt.postSnip}>
              <Text style={comt.postTxt} numberOfLines={2}>{post.content}</Text>
            </View>
          )}

          {/* Lista de comentarios */}
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: S[16], gap: 12 }}>
            {comments.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 32 }}>
                <Text style={{ fontSize: 32 }}>💬</Text>
                <Text style={{ color: C.inkLight, marginTop: 8 }}>Sé el primero en comentar</Text>
              </View>
            ) : comments.map(c => (
              <View key={c.id} style={comt.commentRow}>
                <View style={comt.commentAvatar}>
                  <Text style={comt.commentInitial}>{(c.author_name || 'U')[0].toUpperCase()}</Text>
                </View>
                <View style={comt.commentBody}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={comt.commentName}>{c.author_name}</Text>
                    <Text style={comt.commentTime}>{formatTime(c.created_at)}</Text>
                  </View>
                  <Text style={comt.commentText}>{c.content}</Text>
                </View>
                {c.user_id === currentUser?.id && (
                  <TouchableOpacity onPress={() => deleteComment(c.id)} style={comt.commentDelete}>
                    <Text style={{ fontSize: 11, color: C.inkMuted }}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Input */}
          <View style={comt.inputRow}>
            <View style={[comt.commentAvatar, { backgroundColor: C.tealLight }]}>
              <Text style={[comt.commentInitial, { color: C.teal }]}>{initials}</Text>
            </View>
            <TextInput
              style={comt.input}
              placeholder="Escribí un comentario..."
              placeholderTextColor={C.inkMuted}
              value={text}
              onChangeText={setText}
              multiline
              maxLength={300}
            />
            <TouchableOpacity
              style={[comt.sendBtn, (!text.trim() || sending) && { opacity: 0.4 }]}
              onPress={send}
              disabled={!text.trim() || sending}
            >
              {sending ? <ActivityIndicator color={C.white} size="small" /> : <Send size={18} color={C.white} strokeWidth={2} />}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const comt = StyleSheet.create({
  container:     { flex: 1, backgroundColor: C.white },
  header:        { flexDirection: 'row', alignItems: 'center', padding: S[16], borderBottomWidth: 1, borderBottomColor: C.border },
  closeBtn:      { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:         { flex: 1, textAlign: 'center', fontSize: T.base, fontWeight: '700', color: C.ink },
  postSnip:      { backgroundColor: C.cloud, padding: S[12], marginHorizontal: S[16], marginTop: S[12], borderRadius: R.xl, borderLeftWidth: 3, borderLeftColor: C.teal },
  postTxt:       { fontSize: T.sm, color: C.inkMid, lineHeight: 18 },
  commentRow:    { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  commentAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.tealLight, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  commentInitial:{ fontSize: T.sm, fontWeight: '800', color: C.teal },
  commentBody:   { flex: 1, backgroundColor: C.cloud, borderRadius: R.xl, padding: S[10] },
  commentName:   { fontSize: T.xs, fontWeight: '700', color: C.ink },
  commentTime:   { fontSize: 10, color: C.inkMuted },
  commentText:   { fontSize: T.sm, color: C.ink, marginTop: 3, lineHeight: 18 },
  commentDelete: { padding: 6 },
  inputRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: S[12], borderTopWidth: 1, borderTopColor: C.border },
  input:         { flex: 1, backgroundColor: C.cloud, borderRadius: R.xl, paddingHorizontal: S[14], paddingVertical: 10, fontSize: T.sm, color: C.ink, maxHeight: 100 },
  sendBtn:       { width: 40, height: 40, borderRadius: 20, backgroundColor: C.teal, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
});

// ── Post Card ─────────────────────────────────────────────────────────────────
function PostCard({ item, currentUserId, onLike, onDelete, currentUser }) {
  const [showDelete,    setShowDelete]    = useState(false);
  const [showComment,   setShowComment]   = useState(false);
  const [commentCount,  setCommentCount]  = useState(item.comment_count || 0);

  useEffect(() => {
    supabase.from('post_comments').select('id', { count: 'exact', head: true }).eq('post_id', item.id)
      .then(({ count }) => { if (count !== null) setCommentCount(count); });
  }, [item.id]);

  const cat      = CATEGORIES.find(c => c.key === item.category) || CATEGORIES[0];
  const catColor = CAT_COLORS[item.category] || C.teal;
  const initials = (item.author_name || 'U')[0].toUpperCase();
  const isOwn    = item.user_id === currentUserId;

  const handleOpenComments = () => setShowComment(true);
  const handleCloseComments = () => setShowComment(false);

  return (
    <View style={pc.card}>
      <ConfirmModal
        visible={showDelete}
        message="¿Seguro que querés borrar esta publicación?"
        onConfirm={() => { setShowDelete(false); onDelete(item.id); }}
        onCancel={() => setShowDelete(false)}
      />
      <CommentsModal
        visible={showComment}
        post={item}
        currentUser={currentUser}
        onClose={handleCloseComments}
      />

      {/* Header */}
      <View style={pc.header}>
        <View style={[pc.avatar, { backgroundColor: catColor + '25' }]}>
          {item.author_avatar ? (
            <Image source={{ uri: item.author_avatar }} style={pc.avatarImg} />
          ) : (
            <Text style={[pc.avatarTxt, { color: catColor }]}>{initials}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={pc.authorName}>{item.author_name || 'Usuario Mady'}</Text>
          <Text style={pc.time}>Hace {formatTime(item.created_at)}</Text>
        </View>
        <View style={[pc.catBadge, { backgroundColor: catColor + '18', borderColor: catColor + '40' }]}>
          <Text style={pc.catEmoji}>{cat.emoji}</Text>
          <Text style={[pc.catLabel, { color: catColor }]}>{cat.label}</Text>
        </View>
        {isOwn && (
          <TouchableOpacity onPress={() => setShowDelete(true)} style={pc.deleteBtn}>
            <Text style={pc.deleteTxt}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Contenido */}
      <Text style={pc.content}>{item.content}</Text>

      {/* Foto */}
      {item.photo_url ? (
        <Image source={{ uri: item.photo_url }} style={pc.photo} resizeMode="cover" />
      ) : null}

      {/* Acciones */}
      <View style={pc.actions}>
        <TouchableOpacity style={pc.actionBtn} onPress={() => onLike(item)}>
          <Heart size={18} strokeWidth={2} color={item.liked ? C.lost : C.inkMuted} fill={item.liked ? C.lost : 'none'} />
          <Text style={[pc.actionTxt, item.liked && { color: C.lost }]}>{item.likes_count || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={pc.actionBtn} onPress={handleOpenComments}>
          <MessageCircle size={18} color={C.teal} strokeWidth={2} />
          <Text style={[pc.actionTxt, { color: C.teal }]}>
            Comentar{commentCount > 0 ? ` · ${commentCount}` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const pc = StyleSheet.create({
  card: {
    backgroundColor: C.white, borderRadius: R['2xl'],
    marginBottom: S[12], padding: S[16],
    borderWidth: 1, borderColor: C.border,
    shadowColor: C.ink, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  header:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: S[12] },
  avatar:     { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImg:  { width: '100%', height: '100%' },
  avatarTxt:  { fontSize: T.lg, fontWeight: '800' },
  authorName: { fontSize: T.sm, fontWeight: '700', color: C.ink },
  time:       { fontSize: 11, color: C.inkMuted, marginTop: 1 },
  catBadge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: R.full, borderWidth: 1 },
  catEmoji:   { fontSize: 12 },
  catLabel:   { fontSize: 10, fontWeight: '700' },
  content:    { fontSize: T.base, color: C.ink, lineHeight: 22, marginBottom: S[12] },
  photo:      { width: '100%', height: 200, borderRadius: R.xl, marginBottom: S[12] },
  actions:    { flexDirection: 'row', gap: 8, paddingTop: S[8], borderTopWidth: 1, borderTopColor: C.borderLight },
  actionBtn:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: R.full, backgroundColor: C.cloud },
  actionTxt:  { fontSize: T.xs, fontWeight: '600', color: C.inkLight },
  deleteBtn:  { width: 28, height: 28, borderRadius: 14, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  deleteTxt:  { fontSize: 12, color: '#DC2626', fontWeight: '700' },
});

// ── Modal nuevo post ──────────────────────────────────────────────────────────
function NewPostModal({ visible, onClose, onPost, currentUser }) {
  const [content,  setContent]  = useState('');
  const [category, setCategory] = useState('general');
  const [photo,    setPhoto]    = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [postError, setPostError] = useState('');

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [4, 3], quality: 0.8, base64: true,
    });
    if (!result.canceled) setPhoto({ uri: result.assets[0].uri, base64: result.assets[0].base64 });
  };

  const handlePost = async () => {
    if (!content.trim()) return;
    setLoading(true);
    setPostError('');
    try {
      let photoUrl = null;
      if (photo) {
        try { photoUrl = await uploadPostPhoto(photo.uri, photo.base64); } catch {}
      }
      const { data: { user } } = await supabase.auth.getUser();

      // Asegurar que el perfil existe antes de publicar
      await supabase.from('profiles').upsert({
        id:   user.id,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuario',
      }, { onConflict: 'id', ignoreDuplicates: true });

      const { error } = await supabase.from('posts').insert({
        user_id:   user.id,
        content:   content.trim(),
        category,
        photo_url: photoUrl,
      });
      if (error) throw error;
      setContent('');
      setPhoto(null);
      setCategory('general');
      onPost();
      onClose();
    } catch (e) {
      setPostError(e?.message || 'No se pudo publicar. Intentá de nuevo.');
    }
    setLoading(false);
  };

  const name    = currentUser?.user_metadata?.name || currentUser?.email?.split('@')[0] || 'Vos';
  const initials = (name || 'U')[0].toUpperCase();

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={nm.container}>
          {/* Header modal */}
          <View style={nm.header}>
            <TouchableOpacity onPress={onClose} style={nm.closeBtn}>
              <X size={20} color={C.ink} strokeWidth={2} />
            </TouchableOpacity>
            <Text style={nm.title}>Nueva publicación</Text>
            <TouchableOpacity
              style={[nm.postBtn, (!content.trim() || loading) && { opacity: 0.4 }]}
              onPress={handlePost}
              disabled={!content.trim() || loading}
            >
              {loading ? <ActivityIndicator color={C.white} size="small" /> : <Text style={nm.postBtnTxt}>Publicar</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
            {postError ? (
              <View style={{ backgroundColor: '#FEE2E2', padding: 12, margin: 16, borderRadius: 10 }}>
                <Text style={{ color: '#DC2626', fontSize: 13, fontWeight: '600' }}>{postError}</Text>
              </View>
            ) : null}
            {/* Avatar + input */}
            <View style={nm.inputRow}>
              <View style={[nm.avatar, { backgroundColor: C.tealLight }]}>
                <Text style={[nm.avatarTxt, { color: C.teal }]}>{initials}</Text>
              </View>
              <TextInput
                style={nm.input}
                placeholder={`¿Qué querés compartir, ${name}?`}
                placeholderTextColor={C.inkMuted}
                value={content}
                onChangeText={setContent}
                multiline
                autoFocus
                maxLength={500}
              />
            </View>

            {/* Preview foto */}
            {photo ? (
              <View style={nm.photoWrap}>
                <Image source={{ uri: photo.uri }} style={nm.photoPreview} resizeMode="cover" />
                <TouchableOpacity style={nm.photoRemove} onPress={() => setPhoto(null)}>
                  <X size={14} color={C.white} strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Categoría */}
            <Text style={nm.sectionLabel}>Categoría</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: S[16], marginBottom: S[16] }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingRight: S[16] }}>
                {CATEGORIES.map(cat => {
                  const color = CAT_COLORS[cat.key];
                  const on = category === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[nm.catChip, on && { backgroundColor: color, borderColor: color }]}
                      onPress={() => setCategory(cat.key)}
                    >
                      <Text style={nm.catEmoji}>{cat.emoji}</Text>
                      <Text style={[nm.catLabel, on && { color: C.white }]}>{cat.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            {/* Agregar foto */}
            <TouchableOpacity style={nm.photoBtn} onPress={pickPhoto}>
              <Camera size={20} color={C.teal} strokeWidth={1.75} />
              <Text style={nm.photoBtnTxt}>Agregar foto</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const nm = StyleSheet.create({
  container:  { flex: 1, backgroundColor: C.white },
  header:     { flexDirection: 'row', alignItems: 'center', padding: S[16], borderBottomWidth: 1, borderBottomColor: C.border },
  closeBtn:   { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  title:      { flex: 1, textAlign: 'center', fontSize: T.base, fontWeight: '700', color: C.ink },
  postBtn:    { backgroundColor: C.teal, paddingHorizontal: 16, paddingVertical: 8, borderRadius: R.full },
  postBtnTxt: { fontSize: T.sm, fontWeight: '700', color: C.white },
  inputRow:   { flexDirection: 'row', gap: 12, padding: S[16] },
  avatar:     { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarTxt:  { fontSize: T.lg, fontWeight: '800' },
  input:      { flex: 1, fontSize: T.base, color: C.ink, lineHeight: 22, minHeight: 100 },
  photoWrap:  { margin: S[16], position: 'relative' },
  photoPreview: { width: '100%', height: 200, borderRadius: R.xl },
  photoRemove:  { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  sectionLabel: { fontSize: T.xs, fontWeight: '700', color: C.inkLight, marginLeft: S[16], marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  catChip:    { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 8, borderRadius: R.full, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  catEmoji:   { fontSize: 14 },
  catLabel:   { fontSize: T.xs, fontWeight: '600', color: C.inkMid },
  photoBtn:   { flexDirection: 'row', alignItems: 'center', gap: 8, margin: S[16], padding: S[14], borderRadius: R.xl, borderWidth: 1.5, borderColor: C.teal + '50', borderStyle: 'dashed', backgroundColor: C.tealLight },
  photoBtnTxt:{ fontSize: T.sm, fontWeight: '600', color: C.teal },
});

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function ComunidadScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser } = useAuth();

  const [posts,      setPosts]      = useState([]);
  const [filter,     setFilter]     = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [showModal,  setShowModal]  = useState(false);

  const loadPosts = async () => {
    // Timeout de 8 segundos para no quedarse cargando para siempre
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000));
    try {
      const { data, error } = await Promise.race([
        supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(50),
        timeout,
      ]);

      if (error) {
        console.log('loadPosts error:', JSON.stringify(error));
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const userId = currentUser?.id;
        let likedIds = new Set();
        if (userId) {
          const { data: likes } = await supabase
            .from('post_likes').select('post_id').eq('user_id', userId);
          if (likes) likedIds = new Set(likes.map(l => l.post_id));
        }
        const userIds = [...new Set(data.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from('profiles').select('id, name, avatar_url').in('id', userIds);
        const profileMap = {};
        if (profiles) profiles.forEach(p => { profileMap[p.id] = p; });

        setPosts(data.map(p => ({
          ...p,
          author_name:   profileMap[p.user_id]?.name || 'Usuario',
          author_avatar: profileMap[p.user_id]?.avatar_url || null,
          liked: likedIds.has(p.id),
        })));
      } else {
        setPosts([]);
      }
    } catch (e) {
      console.log('loadPosts catch:', e?.message);
      setPosts([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPosts();
    const channel = supabase
      .channel('posts-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => loadPosts())
      .subscribe();
    return () => channel.unsubscribe();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
  };

  const onDelete = async (postId) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    await supabase.from('posts').delete().eq('id', postId);
  };

  const onLike = async (post) => {
    const userId = currentUser?.id;
    if (!userId) return;
    const liked = post.liked;
    // Optimistic update
    setPosts(prev => prev.map(p => p.id === post.id
      ? { ...p, liked: !liked, likes_count: liked ? (p.likes_count||1) - 1 : (p.likes_count||0) + 1 }
      : p
    ));
    if (liked) {
      await supabase.from('post_likes').delete().match({ user_id: userId, post_id: post.id });
      await supabase.from('posts').update({ likes_count: Math.max(0, (post.likes_count||1) - 1) }).eq('id', post.id);
    } else {
      await supabase.from('post_likes').insert({ user_id: userId, post_id: post.id });
      await supabase.from('posts').update({ likes_count: (post.likes_count||0) + 1 }).eq('id', post.id);
    }
  };

  const filtered = filter === 'all' ? posts : posts.filter(p => p.category === filter);

  return (
    <View style={[s.screen, { paddingTop: insets.top }]}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Comunidad</Text>
          <Text style={s.sub}>Río Grande · {posts.length > 0 ? `${posts.length} ${posts.length === 1 ? 'publicación' : 'publicaciones'}` : loading ? 'Cargando...' : '0 publicaciones'}</Text>
        </View>
        <TouchableOpacity style={s.newBtn} onPress={() => setShowModal(true)}>
          <Text style={s.newBtnTxt}>+ Publicar</Text>
        </TouchableOpacity>
      </View>

      {/* Filtros por categoría */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterRow}>
        <TouchableOpacity
          style={[s.filterChip, filter === 'all' && s.filterChipOn]}
          onPress={() => setFilter('all')}
        >
          <Text style={[s.filterTxt, filter === 'all' && s.filterTxtOn]}>✨ Todo</Text>
        </TouchableOpacity>
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[s.filterChip, filter === cat.key && { backgroundColor: CAT_COLORS[cat.key], borderColor: CAT_COLORS[cat.key] }]}
            onPress={() => setFilter(cat.key)}
          >
            <Text style={[s.filterTxt, filter === cat.key && { color: C.white }]}>{cat.emoji} {cat.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Feed */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.teal} size="large" />
          <Text style={s.loadingTxt}>Cargando...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <PostCard item={item} currentUserId={currentUser?.id} currentUser={currentUser} onLike={onLike} onDelete={onDelete} />
          )}
          contentContainerStyle={s.feed}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.teal} />}
          ListEmptyComponent={
            <View style={s.center}>
              <Text style={{ fontSize: 48 }}>🐾</Text>
              <Text style={s.emptyTxt}>
                {filter === 'all' ? 'Todavía no hay publicaciones' : 'No hay publicaciones en esta categoría'}
              </Text>
              <Text style={s.emptySub}>¡Sé el primero en compartir algo!</Text>
              {filter === 'all' && (
                <TouchableOpacity style={s.newBtn} onPress={() => setShowModal(true)}>
                  <Text style={s.newBtnTxt}>+ Publicar ahora</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      <NewPostModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onPost={loadPosts}
        currentUser={currentUser}
      />
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.cloud },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: S[20], paddingBottom: S[14],
    backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title:  { fontSize: T['2xl'], fontWeight: '800', color: C.ink },
  sub:    { fontSize: T.xs, color: C.inkLight, marginTop: 2 },
  newBtn: { backgroundColor: C.teal, paddingHorizontal: 16, paddingVertical: 9, borderRadius: R.full },
  newBtnTxt: { fontSize: T.sm, fontWeight: '700', color: C.white },

  filterScroll: { backgroundColor: C.white, borderBottomWidth: 1, borderBottomColor: C.border, height: 56, flexShrink: 0 },
  filterRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: S[12], paddingVertical: 8 },
  filterChip:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: R.full, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.white },
  filterChipOn: { backgroundColor: C.teal, borderColor: C.teal },
  filterTxt:    { fontSize: T.xs, fontWeight: '600', color: C.inkMid },
  filterTxtOn:  { color: C.white },

  feed:       { padding: S[16], paddingTop: S[16], paddingBottom: 100 },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingTxt: { fontSize: T.sm, color: C.inkLight, marginTop: 8 },
  emptyTxt:   { fontSize: T.lg, fontWeight: '700', color: C.ink },
  emptySub:   { fontSize: T.sm, color: C.inkLight },
});
