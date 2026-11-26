import { createClient } from '@supabase/supabase-js';

const supabaseUrl = typeof import.meta !== 'undefined' && import.meta.env 
    ? import.meta.env.VITE_SUPABASE_URL 
    : (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL : '');

const supabaseAnonKey = typeof import.meta !== 'undefined' && import.meta.env 
    ? import.meta.env.VITE_SUPABASE_ANON_KEY 
    : (typeof process !== 'undefined' ? process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY : '');

console.log('🔌 Inicializando Supabase...');
console.log('URL:', supabaseUrl);
// Log do início da chave para conferência
console.log('Key (início):', supabaseAnonKey?.substring(0, 10) + '...');

if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.includes('seu-projeto')) {
    console.error('❌ Chaves do Supabase não configuradas no .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const sb = supabase;
