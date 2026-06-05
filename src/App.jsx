import { useEffect, useState } from 'react';
import JsonNode from './components/JsonTree';
import {
  countFilledFields,
  formatCep,
  formatCnpj,
  formatCnpjInput,
  formatCurrency,
  formatDate,
  formatPhone,
  onlyDigits,
} from './utils/formatters';

const API_BASE_URL = 'https://publica.cnpj.ws/cnpj/';
const RECENT_SEARCHES_KEY = 'consulta-cnpj:recent-searches';
const MAX_RECENT_SEARCHES = 5;

function LogoMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#3B5BDB,_#6D83F2)] shadow-[0_14px_30px_rgba(59,91,219,0.35)]">
        <span className="font-display text-lg font-bold tracking-[0.18em] text-white">C+</span>
      </div>
      <div>
        <div className="font-display text-lg font-semibold tracking-tight text-white">
          CONSULTA-CNPJ
        </div>
        <div className="text-xs uppercase tracking-[0.24em] text-slate-400">
          Receita Federal Insights
        </div>
      </div>
    </div>
  );
}

function HistoryIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current">
      <path
        d="M3 12a9 9 0 1 0 3-6.708M3 4v5h5M12 7v5l3 2"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function StatusBadge({ status }) {
  const normalized = String(status ?? '').toLowerCase();
  let tone =
    'border-amber-500/30 bg-amber-500/12 text-amber-200 shadow-[0_0_0_1px_rgba(245,158,11,0.08)]';

  if (normalized === 'ativa') {
    tone =
      'border-emerald-500/30 bg-emerald-500/12 text-emerald-200 shadow-[0_0_0_1px_rgba(16,185,129,0.08)]';
  } else if (
    normalized.includes('baixada') ||
    normalized.includes('suspensa') ||
    normalized.includes('inapta')
  ) {
    tone =
      'border-rose-500/30 bg-rose-500/12 text-rose-200 shadow-[0_0_0_1px_rgba(244,63,94,0.08)]';
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tone}`}
    >
      {status || 'Nao informada'}
    </span>
  );
}

function ExecutiveItem({ label, value, wide = false }) {
  return (
    <div
      className={`rounded-[24px] border border-white/6 bg-white/[0.04] p-4 ${
        wide ? 'md:col-span-2' : ''
      }`}
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium leading-6 text-slate-100">{value || '-'}</div>
    </div>
  );
}

function SkeletonBlock({ className = '' }) {
  return <div className={`animate-pulse rounded-2xl bg-white/8 ${className}`.trim()} />;
}

function SkeletonResultCard() {
  return (
    <div className="rounded-[32px] border border-white/8 bg-[#15171c] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.32)]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <SkeletonBlock className="h-4 w-28" />
          <SkeletonBlock className="h-9 w-72 max-w-full" />
          <SkeletonBlock className="h-5 w-56 max-w-full" />
        </div>
        <SkeletonBlock className="h-9 w-24" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24" />
        <SkeletonBlock className="h-24 md:col-span-2" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-[32px] border border-dashed border-white/10 bg-[#15171c] px-6 py-14 text-center shadow-[0_18px_70px_rgba(0,0,0,0.22)]">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04]">
        <HistoryIcon />
      </div>
      <h2 className="mt-5 font-display text-2xl font-semibold text-white">
        Consulte um CNPJ para abrir o resumo executivo
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-400">
        A tela principal vai destacar nome, CNPJ, situacao, atividade principal, endereco e
        telefone. Os dados completos ficam recolhidos logo abaixo.
      </p>
    </div>
  );
}

function getAddress(estabelecimento) {
  if (!estabelecimento) {
    return '-';
  }

  const parts = [
    [estabelecimento.tipo_logradouro, estabelecimento.logradouro].filter(Boolean).join(' '),
    estabelecimento.numero,
    estabelecimento.complemento,
    estabelecimento.bairro,
    [estabelecimento.cidade?.nome, estabelecimento.estado?.sigla].filter(Boolean).join('/'),
  ].filter(Boolean);

  return parts.length ? parts.join(', ') : '-';
}

function buildStateRegistrations(inscricoes) {
  if (!Array.isArray(inscricoes) || !inscricoes.length) {
    return 'Nenhuma inscricao estadual informada';
  }

  return inscricoes
    .map((item) => {
      const status = item.ativo ? 'ativa' : 'inativa';
      return `${item.estado?.sigla ?? 'UF'}: ${item.inscricao_estadual ?? '-'} (${status})`;
    })
    .join(' | ');
}

function getResponsibleLabel(companyData) {
  if (companyData?.responsavel_federativo) {
    return companyData.responsavel_federativo;
  }

  const firstPartner = companyData?.socios?.[0];
  if (firstPartner?.nome) {
    return firstPartner.nome;
  }

  return '-';
}

function getPrimaryCnae(estabelecimento) {
  const cnae = estabelecimento?.atividade_principal;
  if (!cnae) {
    return '-';
  }

  const code = cnae.subclasse ?? cnae.id ?? cnae.codigo ?? '';
  const description = cnae.descricao ?? '';

  if (code && description) {
    return `${code} | ${description}`;
  }

  return code || description || '-';
}

function getStatusSummary(companyData) {
  const status = companyData?.estabelecimento?.situacao_cadastral;
  const openingDate = formatDate(companyData?.estabelecimento?.data_inicio_atividade);
  const pieces = [formatCnpj(companyData?.estabelecimento?.cnpj)];

  if (openingDate && openingDate !== '-') {
    pieces.push(`Abertura: ${openingDate}`);
  }

  return {
    title: companyData?.razao_social || 'Nenhuma consulta realizada',
    subtitle: pieces.join(' | '),
    status,
  };
}

function loadRecentSearches() {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(RECENT_SEARCHES_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentSearches(list) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(list));
}

function upsertRecentSearch(list, companyData) {
  const cnpj = onlyDigits(companyData?.estabelecimento?.cnpj);
  if (!cnpj) {
    return list;
  }

  const next = [
    {
      cnpj,
      razaoSocial: companyData?.razao_social || 'Empresa consultada',
      situacao: companyData?.estabelecimento?.situacao_cadastral || '',
    },
    ...list.filter((item) => item.cnpj !== cnpj),
  ].slice(0, MAX_RECENT_SEARCHES);

  saveRecentSearches(next);
  return next;
}

export default function App() {
  const [cnpjInput, setCnpjInput] = useState('');
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    setRecentSearches(loadRecentSearches());
  }, []);

  const establishment = companyData?.estabelecimento;
  const rawJson = companyData ? JSON.stringify(companyData, null, 2) : '';
  const filledCount = companyData ? countFilledFields(companyData) : 0;
  const statusSummary = getStatusSummary(companyData);

  async function runLookup(cnpjDigits) {
    setLoading(true);
    setError('');
    setShowRawJson(false);

    try {
      const response = await fetch(`${API_BASE_URL}${cnpjDigits}`);
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('CNPJ nao encontrado na base publica.');
        }

        if (response.status === 429) {
          throw new Error('Limite da API atingido. Aguarde um minuto e tente novamente.');
        }

        throw new Error(payload?.mensagem || payload?.message || 'Falha ao consultar o CNPJ.');
      }

      setCompanyData(payload);
      setRecentSearches((current) => upsertRecentSearch(current, payload));
      setShowHistory(false);
    } catch (requestError) {
      setCompanyData(null);
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Nao foi possivel concluir a consulta.',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const numericCnpj = onlyDigits(cnpjInput);

    if (numericCnpj.length !== 14) {
      setError('Digite um CNPJ com 14 numeros.');
      setCompanyData(null);
      return;
    }

    await runLookup(numericCnpj);
  }

  async function handleCopyJson() {
    if (!rawJson) {
      return;
    }

    try {
      await navigator.clipboard.writeText(rawJson);
    } catch {
      setError('Nao foi possivel copiar o JSON neste navegador.');
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,91,219,0.22),_transparent_32%),linear-gradient(180deg,_#0c0d10_0%,_#101217_48%,_#0b0c10_100%)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="rounded-[36px] border border-white/8 bg-[#111318] px-6 py-7 shadow-[0_24px_90px_rgba(0,0,0,0.36)] sm:px-8 sm:py-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <LogoMark />
              <h1 className="mt-7 font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Consulte dados da Receita Federal com clareza executiva.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-400 sm:text-base">
                Interface otimizada para analise rapida: resumo enxuto, badges de situacao,
                historico local e dados completos recolhidos quando voce precisar ir fundo.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[26px] border border-white/8 bg-white/[0.04] p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Campos preenchidos
                </div>
                <div className="mt-3 font-display text-3xl font-semibold text-white">
                  {filledCount}
                </div>
                <div className="mt-2 text-sm text-slate-400">
                  Atualizado dinamicamente a cada consulta valida.
                </div>
              </div>
              <div className="rounded-[26px] border border-[#3B5BDB]/20 bg-[#3B5BDB]/10 p-5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#AFC0FF]">
                  Fonte publica
                </div>
                <div className="mt-3 font-display text-2xl font-semibold text-white">
                  CNPJ.ws
                </div>
                <div className="mt-2 text-sm text-slate-300">
                  Ate 3 consultas por minuto no plano publico.
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mt-8 grid gap-8 lg:grid-cols-[390px,1fr]">
          <section className="rounded-[32px] border border-white/8 bg-[#111318] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#AFC0FF]">
                  Consulta
                </div>
                <h2 className="mt-3 font-display text-2xl font-semibold text-white">
                  Buscar empresa
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Digite o CNPJ e receba um resumo limpo com acesso posterior aos dados tecnicos.
                </p>
              </div>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowHistory((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.04] px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.08]"
                >
                  <HistoryIcon />
                  Recentes
                </button>

                {showHistory ? (
                  <div className="absolute right-0 z-10 mt-3 w-80 max-w-[80vw] overflow-hidden rounded-3xl border border-white/10 bg-[#171920] shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
                    <div className="border-b border-white/6 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Ultimas 5 consultas
                    </div>
                    {recentSearches.length ? (
                      <div className="p-2">
                        {recentSearches.map((item) => (
                          <button
                            key={item.cnpj}
                            type="button"
                            onClick={() => {
                              setCnpjInput(formatCnpjInput(item.cnpj));
                              runLookup(item.cnpj);
                            }}
                            className="flex w-full items-start justify-between rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.05]"
                          >
                            <div>
                              <div className="text-sm font-semibold text-white">{item.razaoSocial}</div>
                              <div className="mt-1 text-xs text-slate-400">{formatCnpj(item.cnpj)}</div>
                            </div>
                            <span className="ml-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                              {item.situacao || 'Status'}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-5 text-sm text-slate-400">
                        Ainda nao ha consultas salvas neste navegador.
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-300">CNPJ</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  value={cnpjInput}
                  onChange={(event) => setCnpjInput(formatCnpjInput(event.target.value))}
                  className="w-full rounded-2xl border border-white/10 bg-[#171920] px-4 py-3 text-base text-white outline-none transition placeholder:text-slate-600 focus:border-[#5E7AF7] focus:ring-4 focus:ring-[#3B5BDB]/20"
                />
              </label>

              <div className="text-xs leading-6 text-slate-500">
                Powered by CNPJ.ws | ate 3 consultas por minuto
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,_#3B5BDB,_#6D83F2)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(59,91,219,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-65"
                >
                  {loading ? 'Consultando...' : 'Buscar'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCnpjInput('');
                    setCompanyData(null);
                    setError('');
                    setShowRawJson(false);
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-white/8 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08]"
                >
                  Limpar
                </button>
              </div>
            </form>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            ) : null}

            <div className="mt-6 rounded-[28px] border border-white/8 bg-[#171920] p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                O que voce encontra
              </div>
              <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-300">
                <div>Resumo executivo enxuto para leitura rapida.</div>
                <div>Badge de situacao para bater o olho e decidir mais rapido.</div>
                <div>Historico local para consultas recorrentes de RH e contabilidade.</div>
                <div>Explorador completo do JSON sem perder flexibilidade.</div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            {loading ? (
              <SkeletonResultCard />
            ) : companyData ? (
              <div className="rounded-[32px] border border-white/8 bg-[#15171c] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.32)] sm:p-7">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#AFC0FF]">
                      Resumo executivo
                    </div>
                    <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-white">
                      {statusSummary.title}
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-slate-400">{statusSummary.subtitle}</p>
                  </div>
                  <StatusBadge status={statusSummary.status} />
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <ExecutiveItem label="Razao social" value={companyData?.razao_social || '-'} />
                  <ExecutiveItem label="Nome fantasia" value={establishment?.nome_fantasia || '-'} />
                  <ExecutiveItem label="CNPJ" value={formatCnpj(establishment?.cnpj)} />
                  <ExecutiveItem
                    label="Inscricao estadual"
                    value={buildStateRegistrations(establishment?.inscricoes_estaduais)}
                  />
                  <ExecutiveItem
                    label="Situacao cadastral"
                    value={establishment?.situacao_cadastral || '-'}
                  />
                  <ExecutiveItem label="CNAE principal" value={getPrimaryCnae(establishment)} />
                  <ExecutiveItem label="Telefone" value={formatPhone(establishment?.telefone1, establishment?.ddd1)} />
                  <ExecutiveItem label="E-mail" value={establishment?.email || '-'} />
                  <ExecutiveItem label="Responsavel" value={getResponsibleLabel(companyData)} />
                  <ExecutiveItem label="Endereco" value={getAddress(establishment)} wide />
                </div>
              </div>
            ) : (
              <EmptyState />
            )}

            <details className="rounded-[32px] border border-white/8 bg-[#111318] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.24)] sm:p-7">
              <summary className="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#AFC0FF]">
                    Dados completos
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-semibold text-white">
                    Explorador tecnico e JSON bruto
                  </h2>
                </div>
                <div className="text-sm text-slate-400">
                  {companyData
                    ? `${filledCount} campos preenchidos mapeados dinamicamente`
                    : 'Abra apos consultar um CNPJ valido'}
                </div>
              </summary>

              <div className="mt-6 space-y-6">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <ExecutiveItem label="Razao social" value={companyData?.razao_social || '-'} />
                  <ExecutiveItem label="Nome fantasia" value={establishment?.nome_fantasia || '-'} />
                  <ExecutiveItem label="CNPJ" value={formatCnpj(establishment?.cnpj)} />
                  <ExecutiveItem label="Abertura" value={formatDate(establishment?.data_inicio_atividade)} />
                  <ExecutiveItem label="Capital social" value={formatCurrency(companyData?.capital_social)} />
                  <ExecutiveItem label="E-mail" value={establishment?.email || '-'} />
                  <ExecutiveItem label="Telefone" value={formatPhone(establishment?.telefone1, establishment?.ddd1)} />
                  <ExecutiveItem label="Responsavel" value={getResponsibleLabel(companyData)} />
                  <ExecutiveItem label="CEP" value={formatCep(establishment?.cep)} />
                  <ExecutiveItem
                    label="Cidade / UF"
                    value={[establishment?.cidade?.nome, establishment?.estado?.sigla]
                      .filter(Boolean)
                      .join(' / ')}
                  />
                  <ExecutiveItem
                    label="Inscricoes estaduais"
                    value={buildStateRegistrations(establishment?.inscricoes_estaduais)}
                    wide
                  />
                  <ExecutiveItem
                    label="CNAE principal"
                    value={getPrimaryCnae(establishment)}
                  />
                  <ExecutiveItem label="Atualizado em" value={formatDate(companyData?.atualizado_em || establishment?.atualizado_em)} />
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRawJson((current) => !current)}
                    disabled={!companyData}
                    className="rounded-2xl border border-white/8 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {showRawJson ? 'Ocultar JSON bruto' : 'Ver JSON bruto'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    disabled={!companyData}
                    className="rounded-2xl bg-[#3B5BDB] px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Copiar JSON
                  </button>
                </div>

                {showRawJson && rawJson ? (
                  <div className="overflow-hidden rounded-3xl border border-white/8 bg-[#0d0f13]">
                    <div className="border-b border-white/6 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      JSON bruto
                    </div>
                    <pre className="max-h-[420px] overflow-auto px-4 py-4 text-sm leading-6 text-slate-200">
                      {rawJson}
                    </pre>
                  </div>
                ) : null}

                <div>
                  {companyData ? (
                    <JsonNode label="resposta_api" value={companyData} />
                  ) : (
                    <div className="rounded-3xl border border-dashed border-white/10 bg-[#15171c] px-6 py-12 text-center text-sm text-slate-500">
                      Consulte um CNPJ para abrir o painel tecnico completo.
                    </div>
                  )}
                </div>
              </div>
            </details>
          </section>
        </main>

        <footer className="mt-10 px-1 py-2">
          <div className="flex flex-col gap-3 rounded-[22px] bg-[#0d0f13] px-5 py-4 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <div>
              © 2026 CONSULTA-CNPJ. Todos os direitos reservados.
            </div>
            <div className="text-slate-600">
              Plataforma de consulta cadastral
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
