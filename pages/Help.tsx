import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { HelpCircle, MessageCircle, FileText, ChevronDown, ChevronUp, Mail, Search, BookOpen, ExternalLink } from 'lucide-react';

const FAQItem = ({ question, answer }: { question: string, answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-[var(--border-color)] last:border-0 group">
            <button
                className="w-full flex justify-between items-center py-4 text-left focus:outline-none"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1 rounded-full ${isOpen ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 group-hover:text-green-500'}`}>
                        <HelpCircle size={16} />
                    </div>
                    <span className={`font-bold text-sm ${isOpen ? 'text-green-700' : 'text-[var(--text-primary)]'}`}>{question}</span>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-green-600" /> : <ChevronDown size={18} className="text-[var(--text-secondary)]" />}
            </button>
            {isOpen && (
                <div className="pl-11 pb-4 text-sm text-[var(--text-secondary)] animate-in slide-in-from-top-1 leading-relaxed border-l-2 border-green-100 ml-5">
                    {answer}
                </div>
            )}
        </div>
    );
};

export const Help: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const faqs = [
        { q: "Como importar um XML de Nota Fiscal?", a: "Acesse o módulo 'Fiscal', clique em 'Importar XML' no canto superior direito e selecione o arquivo do seu computador. O sistema identificará automaticamente se é NFe, NFCe ou NFSe e preencherá os dados." },
        { q: "Como cadastrar um novo funcionário?", a: "Vá para 'Cadastros > Funcionários' e clique em 'Novo Cadastro'. Preencha as abas de Dados Pessoais, Documentos e Informações Funcionais. O salário base será usado para cálculos automáticos na folha." },
        { q: "O que é o NCM e onde encontro?", a: "NCM (Nomenclatura Comum do Mercosul) é um código de 8 dígitos obrigatório para produtos. Você pode encontrá-lo na nota fiscal de compra do fornecedor ou consultar tabelas oficiais da Receita Federal." },
        { q: "Como alterar a empresa selecionada?", a: "No topo da tela, ao lado do nome da empresa atual, clique no ícone de troca (setas). Você será redirecionado para a tela de seleção de empresas." },
        { q: "O sistema calcula impostos automaticamente?", a: "O sistema fornece uma estimativa baseada nas alíquotas cadastradas em 'Cadastros > Alíquotas' e aplicadas aos produtos/serviços. Para fechamento contábil oficial, revise os dados no módulo Contabilidade." },
        { q: "Como gerar o arquivo SPED Fiscal?", a: "Acesse o menu 'Obrigações' ou 'Livros Fiscais', verifique se todas as notas do período foram importadas e clique em 'Gerar SPED'. O arquivo será validado e baixado automaticamente." },
        { q: "Esqueci minha senha, como recuperar?", a: "Na tela de login, clique em 'Esqueci minha senha'. Um link de recuperação será enviado para o seu e-mail cadastrado." }
    ];

    const filteredFAQs = faqs.filter(f =>
        f.q.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.a.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 pb-10">
            <div className="relative overflow-hidden bg-green-600 rounded-[2.5rem] p-10 text-white shadow-xl shadow-green-200 dark:shadow-none">
                <div className="relative z-10 max-w-2xl">
                    <h1 className="text-4xl font-black tracking-tight mb-4">Como podemos ajudar?</h1>
                    <p className="text-green-100 font-medium text-lg mb-8">Explore nossos guias, tutoriais e respostas para as dúvidas mais comuns.</p>

                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-green-700" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por dúvidas, erros ou funcionalidades..."
                            className="w-full pl-12 pr-4 py-4 rounded-2xl text-green-800 font-bold placeholder:text-green-600/50 shadow-inner focus:ring-4 focus:ring-green-400/30 outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 right-20 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl pointer-events-none"></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content - FAQ */}
                <div className="lg:col-span-2 space-y-8">
                    <Card title="Central de Conhecimento" icon={BookOpen} className="border-0 shadow-sm">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                            {[
                                { title: "Iniciando no Sistema", desc: "Configuração e primeiros passos", icon: "🚀" },
                                { title: "Fiscal & Tributário", desc: "Notas, impostos e obrigações", icon: "📊" },
                                { title: "Pessoal (RH)", desc: "Folha, férias e admissão", icon: "👥" },
                                { title: "Financeiro", desc: "Contas e fluxo de caixa", icon: "💰" }
                            ].map((topic, idx) => (
                                <div key={idx} className="p-4 border border-[var(--border-color)] rounded-2xl hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-all cursor-pointer group bg-[var(--bg-input)]">
                                    <div className="flex items-start justify-between">
                                        <div className="text-2xl mb-2">{topic.icon}</div>
                                        <ExternalLink size={14} className="opacity-0 group-hover:opacity-100 text-green-600 transition-opacity" />
                                    </div>
                                    <h4 className="font-bold text-[var(--text-primary)] group-hover:text-green-700">{topic.title}</h4>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">{topic.desc}</p>
                                </div>
                            ))}
                        </div>

                        <h3 className="text-lg font-black text-[var(--text-primary)] mb-4 flex items-center gap-2">
                            <HelpCircle className="text-green-600" size={20} />
                            Perguntas Frequentes
                        </h3>

                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-2">
                            {filteredFAQs.length > 0 ? (
                                filteredFAQs.map((faq, index) => (
                                    <FAQItem key={index} question={faq.q} answer={faq.a} />
                                ))
                            ) : (
                                <div className="p-8 text-center text-[var(--text-secondary)]">
                                    <p className="font-bold">Nenhum resultado encontrado.</p>
                                    <p className="text-xs">Tente buscar por outros termos.</p>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                {/* Sidebar - Support */}
                <div className="space-y-6">
                    <Card className="bg-[var(--bg-card)] border border-[var(--border-color)] shadow-lg overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>
                        <div className="p-2">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                    <MessageCircle size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-[var(--text-primary)]">Suporte Premium</h3>
                                    <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">Atendimento Humanizado</p>
                                </div>
                            </div>
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 mb-4 h-12">
                                Iniciar Chat Online
                            </Button>
                            <div className="flex justify-center items-center gap-2 text-xs font-medium text-[var(--text-secondary)]">
                                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                Tempo médio de resposta: <span className="text-[var(--text-primary)] font-bold">2 min</span>
                            </div>
                        </div>
                    </Card>

                    <Card title="Abrir Chamado Técnico">
                        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Chamado #4921 criado com sucesso! Nossa equipe entrará em contato em breve.'); }}>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-wider mb-1.5">Assunto</label>
                                <input type="text" className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-green-500 outline-none transition-colors" placeholder="Ex: Erro ao calcular folha" required />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-wider mb-1.5">Módulo</label>
                                    <select className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-green-500 outline-none">
                                        <option>Fiscal</option>
                                        <option>Contábil</option>
                                        <option>Pessoal (RH)</option>
                                        <option>Sistema</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-wider mb-1.5">Prioridade</label>
                                    <select className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:border-green-500 outline-none">
                                        <option>Baixa</option>
                                        <option>Média</option>
                                        <option>Alta</option>
                                        <option>Critica</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-[var(--text-secondary)] tracking-wider mb-1.5">Mensagem</label>
                                <textarea className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3 text-sm h-32 text-[var(--text-primary)] focus:border-green-500 outline-none resize-none" placeholder="Descreva o problema detalhadamente..." required></textarea>
                            </div>
                            <Button type="submit" variant="secondary" className="w-full rounded-xl font-bold h-10" icon={Mail}>
                                Enviar Ticket
                            </Button>
                        </form>
                    </Card>
                </div>
            </div>
        </div>
    );
};