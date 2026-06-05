import { useState } from 'react';
import JsonNode from './components/JsonTree';
import {
  countFilledFields,
  formatCep,
  formatCnpj,
  formatCnpjInput,
  formatCurrency,
  formatDate,
  formatPhone,
} from './utils/formatters';

const API_BASE_URL = 'https://publica.cnpj.ws/cnpj/';

function InfoCard({ label, value, tone = 'default' }) {
  const tones = {
    default: 'border-slate-200 bg-white/85 text-slate-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
  };
  const displayValue = value === null || value === undefined || value === '' ? '-' : value;

  return (
    <div className={`rounded-3xl border p-4 shadow-sm ${tones[tone] ?? tones.default}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{label}</div>
      <div className="mt-2 text-sm leading-6">{displayValue}</div>
    </div>
  );
}

function MetricCard({ label, value, detail }) {
  return (
    <div className="rounded-[28px] border border-white/60 bg-white/75 p-5 shadow-soft backdrop-blur">
      <div className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-slate-950">{value}</div>
      <div className="mt-2 text-sm text-slate-600">{detail}</div>
    </div>
  );
}

function buildAddress(estabelecimento) {
  if (!estabelecimento) {
    return '-';
  }

  const parts = [
    [estabelecimento.tipo_logradouro, estabelecimento.logradouro].filter(Boolean).join(' '),
    estabelecimento.numero,
    estabelecimento.complemento,
    estabelecimento.bairro,
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

export default function App() {
  const [cnpjInput, setCnpjInput] = useState('');
  const [companyData, setCompanyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRawJson, setShowRawJson] = useState(false);

  const filledCount = companyData ? countFilledFields(companyData) : 0;

  const establishment = companyData?.estabelecimento;
  const rawJson = companyData ? JSON.stringify(companyData, null, 2) : '';

  async function handleSubmit(event) {
    event.preventDefault();

    const numericCnpj = cnpjInput.replace(/\D/g, '');

    if (numericCnpj.length !== 14) {
      setError('Digite um CNPJ com 14 numeros.');
      setCompanyData(null);
      return;
    }

    setLoading(true);
    setError('');
    setShowRawJson(false);

    try {
      const response = await fetch(`${API_BASE_URL}${numericCnpj}`);
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

  async function handleCopyJson() {
    if (!rawJson) {
      return;
    }

    try {
      await navigator.clipboard.writeText(rawJson);
    } catch (copyError) {
      setError('Nao foi possivel copiar o JSON neste navegador.');
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,118,110,0.22),_transparent_38%),linear-gradient(135deg,_#e2e8f0_0%,_#f8fafc_42%,_#fff7ed_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
        <header className="overflow-hidden rounded-[36px] border border-white/60 bg-slate-950 px-6 py-8 text-white shadow-soft sm:px-10 sm:py-10">
          <div className="grid gap-8 lg:grid-cols-[1.15fr,0.85fr] lg:items-end">
            <div>
              <div className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-teal-200">
                Consulta publica CNPJ.ws
              </div>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Painel moderno para consultar CNPJ com resumo executivo e JSON completo.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
                Interface responsiva com mascara de CNPJ, loading, tratamento de erros, contador
                de campos preenchidos e renderizacao automatica de qualquer estrutura retornada
                pela API.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <MetricCard
                label="Modo"
                value="Web"
                detail="Aplicacao hospedada na Vercel com consulta direta em https://publica.cnpj.ws/cnpj/{cnpj}"
              />
              <MetricCard
                label="Formato"
                value={filledCount}
                detail="Campos preenchidos no ultimo JSON consultado"
              />
            </div>
          </div>
        </header>

        <main className="mt-8 grid gap-8 lg:grid-cols-[420px,1fr]">
          <section className="rounded-[32px] border border-white/70 bg-white/75 p-6 shadow-soft backdrop-blur sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">Consultar empresa</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Informe o CNPJ sem se preocupar com pontuacao. A mascara e aplicada
                  automaticamente.
                </p>
              </div>
              <div className="rounded-2xl border border-teal-100 bg-teal-50 px-3 py-2 text-right">
                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-teal-700">
                  Campos
                </div>
                <div className="text-2xl font-semibold text-teal-950">{filledCount}</div>
              </div>
            </div>

            <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">CNPJ</span>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="00.000.000/0000-00"
                  value={cnpjInput}
                  onChange={(event) => setCnpjInput(formatCnpjInput(event.target.value))}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-teal-500 focus:ring-4 focus:ring-teal-100"
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
                >
                  {loading ? 'Consultando...' : 'Consultar CNPJ'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCnpjInput('');
                    setCompanyData(null);
                    setError('');
                    setShowRawJson(false);
                  }}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Limpar
                </button>
              </div>
            </form>

            {error ? (
              <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {error}
              </div>
            ) : null}

            {loading ? (
              <div className="mt-4 rounded-2xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
                Consultando a API publica e organizando os dados para exibicao...
              </div>
            ) : null}

            <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
                Recursos incluidos
              </h3>
              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                <div>Resumo visual dos principais dados cadastrais.</div>
                <div>Renderizacao automatica de objetos, listas e listas de objetos.</div>
                <div>Formato inteligente para datas, CEP, CNPJ, telefones, booleanos e capital.</div>
                <div>Visualizacao e copia do JSON bruto da resposta.</div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-[32px] border border-white/70 bg-white/75 p-6 shadow-soft backdrop-blur sm:p-7">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Resumo da empresa
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    {companyData?.razao_social || 'Nenhuma consulta realizada'}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {establishment?.nome_fantasia ||
                      'Os dados consolidados aparecerao aqui assim que um CNPJ valido for consultado.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setShowRawJson((current) => !current)}
                    disabled={!companyData}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {showRawJson ? 'Ocultar JSON' : 'Ver JSON bruto'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    disabled={!companyData}
                    className="rounded-2xl bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-teal-300"
                  >
                    Copiar JSON
                  </button>
                </div>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoCard label="Razao social" value={companyData?.razao_social} />
                <InfoCard label="Nome fantasia" value={establishment?.nome_fantasia} />
                <InfoCard
                  label="Situacao"
                  value={establishment?.situacao_cadastral}
                  tone={
                    establishment?.situacao_cadastral?.toLowerCase() === 'ativa'
                      ? 'success'
                      : 'warning'
                  }
                />
                <InfoCard label="CNPJ" value={formatCnpj(establishment?.cnpj)} />
                <InfoCard label="Abertura" value={formatDate(establishment?.data_inicio_atividade)} />
                <InfoCard label="Capital social" value={formatCurrency(companyData?.capital_social)} />
                <InfoCard label="CNAE principal" value={establishment?.atividade_principal?.descricao} />
                <InfoCard label="Telefone" value={formatPhone(establishment?.telefone1, establishment?.ddd1)} />
                <InfoCard label="E-mail" value={establishment?.email} />
                <InfoCard label="Endereco" value={buildAddress(establishment)} />
                <InfoCard
                  label="Cidade / UF"
                  value={[establishment?.cidade?.nome, establishment?.estado?.sigla].filter(Boolean).join(' / ')}
                />
                <InfoCard label="CEP" value={formatCep(establishment?.cep)} />
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <InfoCard label="Inscricoes estaduais" value={buildStateRegistrations(establishment?.inscricoes_estaduais)} />
                <InfoCard label="Atualizado em" value={formatDate(companyData?.atualizado_em || establishment?.atualizado_em)} />
              </div>

              {showRawJson && rawJson ? (
                <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-slate-950">
                  <div className="border-b border-slate-800 px-4 py-3 text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    JSON bruto
                  </div>
                  <pre className="max-h-[420px] overflow-auto px-4 py-4 text-sm leading-6 text-slate-100">
                    {rawJson}
                  </pre>
                </div>
              ) : null}
            </div>

            <div className="rounded-[32px] border border-white/70 bg-white/75 p-6 shadow-soft backdrop-blur sm:p-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Explorador dinamico
                  </div>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                    Todos os dados retornados pela API
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-slate-600">
                  Esta secao percorre o JSON de forma recursiva, entao novos campos, objetos e
                  listas aparecem automaticamente sem precisar alterar o frontend.
                </p>
              </div>

              <div className="mt-6">
                {companyData ? (
                  <JsonNode label="resposta_api" value={companyData} />
                ) : (
                  <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
                    Consulte um CNPJ para abrir o painel dinamico com todos os campos retornados.
                  </div>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
