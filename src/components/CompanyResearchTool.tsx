import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Separator } from './ui/separator'
import { Badge } from './ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
import { Skeleton } from './ui/skeleton'
import { toast } from 'sonner@2.0.3'
import {
  ArrowLeft,
  Building2,
  Loader2,
  Check,
  Copy,
  Link,
  X,
  AlertTriangle,
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { CompanyResearchJSON } from '../types/companyResearch'
import { getDistinctId, trackCompanyResearchGeneratedDevOnly } from '../lib/analytics'

interface CompanyResearchToolProps { onBack: () => void }

type UrlImportState = { host: string } | null

function useToday() {
  return useMemo(() => new Date().toISOString().slice(0,10), [])
}

function Chip({ label, value }: { label: string; value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
  return (
    <Badge variant="secondary" className="text-xs">
      {label}: {pct}
    </Badge>
  )
}

function TagInput({ label, values, onChange, placeholder }: { label: string; values: string[]; onChange: (next: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState('')
  const add = () => {
    const v = draft.trim()
    if (!v) return
    if (values.includes(v)) return
    onChange([...values, v])
    setDraft('')
  }
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-2">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
        <Button type="button" onClick={add}>Add</Button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((v) => (
            <Badge key={v} variant="outline" className="flex items-center gap-1">
              {v}
              <button aria-label={`remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export function CompanyResearchTool({ onBack }: CompanyResearchToolProps) {
  const today = useToday()
  const [company, setCompany] = useState('')
  const [roleFunction, setRoleFunction] = useState('')
  const [locationMode, setLocationMode] = useState('')
  const [date, setDate] = useState(today)
  const [jobUrl, setJobUrl] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [team, setTeam] = useState('')
  const [jdText, setJdText] = useState('')
  const [products, setProducts] = useState<string[]>([])
  const [competitors, setCompetitors] = useState<string[]>([])
  const [execs, setExecs] = useState<string[]>([])
  const [urlCareers, setUrlCareers] = useState('')
  const [urlBlog, setUrlBlog] = useState('')
  const [urlPress, setUrlPress] = useState('')
  const [urlDocs, setUrlDocs] = useState('')
  const [notes, setNotes] = useState('')

  const [isImporting, setIsImporting] = useState(false)
  const [importBanner, setImportBanner] = useState<UrlImportState>(null)
  const [isRunning, setIsRunning] = useState(false)

  const [markdown, setMarkdown] = useState('')
  const [json, setJson] = useState<CompanyResearchJSON | null>(null)

  const canRun = company.trim().length > 0 && !isRunning

  async function handleImportJD() {
    if (!jobUrl.trim()) { toast.error('Please enter a valid URL'); return }
    setIsImporting(true)
    try {
      const r = await fetch('/api/jd-from-url', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: jobUrl.trim() }) })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data?.error || 'Import failed')
      setJdText(String(data?.text || ''))
      const host = String(data?.host || '')
      setImportBanner(host ? { host } : null)
      toast.success(host ? `Imported job description from ${host}` : 'Imported job description')
    } catch (e: any) {
      toast.error(String(e?.message || 'Unable to import from URL'))
    } finally {
      setIsImporting(false)
    }
  }

  function clearAll() {
    setCompany(''); setRoleFunction(''); setLocationMode(''); setDate(today)
    setJobUrl(''); setJobTitle(''); setTeam(''); setJdText(''); setImportBanner(null)
    setProducts([]); setCompetitors([]); setExecs([])
    setUrlCareers(''); setUrlBlog(''); setUrlPress(''); setUrlDocs('')
    setNotes('')
    setMarkdown(''); setJson(null)
  }

  async function runResearch() {
    if (!company.trim()) { toast.error('Company is required'); return }
    setIsRunning(true)
    try {
      const distinctId = getDistinctId()
      const body = {
        company: company.trim(),
        role_function: roleFunction.trim() || undefined,
        location_mode: locationMode.trim() || undefined,
        today: date,
        role_details: {
          job_url: jobUrl.trim() || undefined,
          job_title: jobTitle.trim() || undefined,
          team: team.trim() || undefined,
          jd_text: jdText.trim() || undefined,
        },
        company_hints: {
          products: products.length ? products : undefined,
          competitors: competitors.length ? competitors : undefined,
          execs: execs.length ? execs : undefined,
          urls: (urlCareers || urlBlog || urlPress || urlDocs) ? { careers: urlCareers || undefined, blog: urlBlog || undefined, press: urlPress || undefined, docs: urlDocs || undefined } : undefined,
          notes: notes.trim() || undefined,
        }
      }
      const r = await fetch('/api/company-research', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(distinctId ? { 'x-ph-distinct-id': distinctId } : {}) }, body: JSON.stringify(body) })
      const data = await r.json().catch(() => ({}))
      if (!r.ok) throw new Error(data?.error || 'Research failed')
      setMarkdown(String(data?.markdown || ''))
      setJson(data?.json || null)
      toast.success('Company research complete')
      trackCompanyResearchGeneratedDevOnly()
    } catch (e: any) {
      toast.error(String(e?.message || 'Failed to run research'))
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <Separator orientation="vertical" className="h-6 hidden sm:block" />
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg"><Building2 className="w-5 h-5" /></div>
                <h1 className="text-lg sm:text-xl font-semibold">Company Research</h1>
                <Badge className="text-xs hidden sm:inline-flex">AI-Powered</Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={clearAll}>Clear</Button>
              <Button onClick={runResearch} disabled={!canRun}>{isRunning ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Running...</>) : 'Run research'}</Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Form card */}
        <Card>
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="company">Company <span className="text-destructive">*</span></Label>
              <Input id="company" placeholder="e.g., Acme Inc." value={company} onChange={(e) => setCompany(e.target.value)} />
              {!company.trim() && <p className="text-xs text-destructive">Company is required</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="role_function">Role / Function</Label>
                <Input id="role_function" value={roleFunction} onChange={(e) => setRoleFunction(e.target.value)} placeholder="e.g., Product" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_mode">Location or Remote</Label>
                <Input id="location_mode" value={locationMode} onChange={(e) => setLocationMode(e.target.value)} placeholder="e.g., Remote" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="today">Today's date</Label>
                <Input id="today" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>

            <Separator />
            <div className="space-y-4">
              <h3 className="font-medium">Role details (optional)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="job_url">Job posting URL</Label>
                  <div className="flex gap-2">
                    <Input id="job_url" placeholder="https://..." value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} />
                    <Button type="button" onClick={handleImportJD} disabled={!jobUrl.trim() || isImporting}>{isImporting ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Importing...</>) : 'Import'}</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_title">Job title</Label>
                  <Input id="job_title" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g., PM" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="team">Team / Org</Label>
                  <Input id="team" value={team} onChange={(e) => setTeam(e.target.value)} placeholder="e.g., Growth" />
                </div>
              </div>
              {importBanner && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-3 rounded-lg">
                  <div className="flex items-center gap-2 text-sm"><Link className="w-4 h-4"/> Imported from {importBanner.host}</div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="jd_text">JD text</Label>
                <Textarea id="jd_text" value={jdText} onChange={(e) => setJdText(e.target.value)} className="min-h-32" placeholder="Paste job description text (optional)" />
              </div>
            </div>

            <Separator />
            <div className="space-y-4">
              <h3 className="font-medium">Company specifics (optional)</h3>
              <TagInput label="Known products" values={products} onChange={setProducts} placeholder="Add a product then Enter" />
              <TagInput label="Known competitors" values={competitors} onChange={setCompetitors} placeholder="Add a competitor then Enter" />
              <TagInput label="Executive names to prioritize" values={execs} onChange={setExecs} placeholder="Add an executive then Enter" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="careers">Careers URL</Label>
                  <Input id="careers" value={urlCareers} onChange={(e) => setUrlCareers(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="blog">Blog URL</Label>
                  <Input id="blog" value={urlBlog} onChange={(e) => setUrlBlog(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="press">Press URL</Label>
                  <Input id="press" value={urlPress} onChange={(e) => setUrlPress(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="docs">Docs URL</Label>
                  <Input id="docs" value={urlDocs} onChange={(e) => setUrlDocs(e.target.value)} placeholder="https://..." />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes / hypotheses to test</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-24" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Results</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={!markdown} onClick={async () => { await navigator.clipboard.writeText(markdown); toast.success('Markdown copied') }}>
                  <Copy className="w-3 h-3 mr-1"/> Copy Markdown
                </Button>
                <Button variant="outline" size="sm" disabled={!json} onClick={async () => { await navigator.clipboard.writeText(JSON.stringify(json, null, 2)); toast.success('JSON copied') }}>
                  <Check className="w-3 h-3 mr-1"/> Copy JSON
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isRunning ? (
              <div className="space-y-4">
                <Skeleton className="h-6 w-40"/>
                <Skeleton className="h-4 w-full"/>
                <Skeleton className="h-4 w-2/3"/>
                <Skeleton className="h-64 w-full"/>
              </div>
            ) : (
              <Tabs defaultValue="summary">
                <TabsList className="grid grid-cols-4 w-full mb-4">
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="json">JSON</TabsTrigger>
                  <TabsTrigger value="evidence">Evidence</TabsTrigger>
                </TabsList>
                <TabsContent value="summary">
                  {!json ? (
                    <div className="text-sm text-muted-foreground">Run research to see the summary</div>
                  ) : (
                    <div className="space-y-3">
                      {json?.confidence && json.confidence.overall < 0.4 && (
                        <div className="flex items-center gap-2 p-3 rounded border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-900 dark:text-yellow-200">
                          <AlertTriangle className="w-4 h-4"/> Low confidence. Verify sources before using.
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{json.company} — {json.stage}</div>
                        <div className="flex gap-2 flex-wrap">
                          <Chip label="Leadership" value={json.confidence.leadership} />
                          <Chip label="Financials" value={json.confidence.financials} />
                          <Chip label="AI" value={json.confidence.ai} />
                        </div>
                      </div>
                      <div className="w-full bg-muted h-2 rounded">
                        <div className="bg-primary h-2 rounded" style={{ width: `${Math.round(Math.max(0, Math.min(1, json.confidence.overall)) * 100)}%` }} />
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="details">
                  {!json ? (
                    <div className="text-sm text-muted-foreground">No details yet.</div>
                  ) : (
                    <div className="space-y-4 text-sm">
                      <div>
                        <div className="font-medium mb-1">Leadership</div>
                        <p>{json.leadership.founder_market_fit}</p>
                        <p>{json.leadership.track_record}</p>
                        <p>{json.leadership.org_stability}</p>
                        <p>{json.leadership.board_governance}</p>
                        <p>{json.leadership.ai_ownership}</p>
                      </div>
                      <Separator />
                      <div>
                        <div className="font-medium mb-1">Snapshot</div>
                        <p>Products: {json.snapshot.products.join(', ') || '—'}</p>
                        <p>ICP: {json.snapshot.icp.join(', ') || '—'}</p>
                        <p>Pricing: {json.snapshot.pricing_model}</p>
                        <p>Geo: {json.snapshot.geo}</p>
                        <p>Headcount trend: {json.snapshot.headcount_trend}</p>
                      </div>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="json">
                  {json ? (
                    <pre className="text-xs bg-muted p-3 rounded overflow-x-auto"><code>{JSON.stringify(json, null, 2)}</code></pre>
                  ) : (
                    <div className="text-sm text-muted-foreground">No JSON yet.</div>
                  )}
                </TabsContent>
                <TabsContent value="evidence">
                  {!json || !json.evidence_table?.length ? (
                    <div className="text-sm text-muted-foreground">No evidence yet.</div>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Dimension</TableHead>
                            <TableHead>Evidence</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Source</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {json.evidence_table.map((e, i) => (
                            <TableRow key={i}>
                              <TableCell className="whitespace-nowrap">{e.dimension}</TableCell>
                              <TableCell className="min-w-[360px]">{e.evidence}</TableCell>
                              <TableCell className="whitespace-nowrap">{e.date}</TableCell>
                              <TableCell className="whitespace-nowrap">
                                <a className="text-blue-600 underline" href={e.source} target="_blank" rel="noreferrer">link</a>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
