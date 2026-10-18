import type { Context } from '@deepseek-ai/cordis'

/** Read-only subset of the official layout service used by both skins. */
export interface PanelContext extends Context {
  layout: {
    panelInfo: {
      getSnapshot(): { readonly activePanelId: string | null }
      subscribe(listener: () => void): () => void
    }
  }
}

type State = { original: string | null; owners: Map<symbol, boolean> }
const states = new WeakMap<HTMLElement, Map<string, State>>()

/** Project official navigation state without inspecting the rendered page tree. */
export function installPanelPageState(ctx: PanelContext, body: HTMLElement, attribute: string): void {
  let attributes = states.get(body)
  if (!attributes) states.set(body, attributes = new Map())
  let state = attributes.get(attribute)
  if (!state) attributes.set(attribute, state = { original: body.getAttribute(attribute), owners: new Map() })
  const owned = state
  const owner = Symbol(attribute)
  owned.owners.set(owner, false)
  let unsubscribe: (() => void) | undefined
  const render = (): void => {
    const active = [...owned.owners.values()].at(-1)!
    if (body.hasAttribute(attribute) !== active) body.toggleAttribute(attribute, active)
  }
  ctx.effect(() => () => {
    unsubscribe?.()
    const applied = [...owned.owners.values()].at(-1) ? '' : null
    owned.owners.delete(owner)
    if (owned.owners.size) return render()
    attributes.delete(attribute)
    if (!attributes.size) states.delete(body)
    if (body.getAttribute(attribute) !== applied) return
    if (owned.original === null) body.removeAttribute(attribute)
    else body.setAttribute(attribute, owned.original)
  }, 'skin: official panel state')
  const sync = (): void => {
    owned.owners.set(owner, ctx.layout.panelInfo.getSnapshot().activePanelId !== null)
    render()
  }
  unsubscribe = ctx.layout.panelInfo.subscribe(sync)
  sync()
}
