import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type Item = {
  id: string
  name: string
  quantity: number
  lowStockThreshold: number
}

function AddItemForm({ onAdded }: { onAdded: (item: Item) => void }) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const saving = useRef(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving.current) return

    const form = event.currentTarget
    const fields = new FormData(form)
    const name = String(fields.get('name') ?? '').trim()
    const quantityText = String(fields.get('quantity') ?? '').trim()
    const thresholdText = String(fields.get('lowStockThreshold') ?? '').trim()
    const quantity = Number(quantityText)
    const lowStockThreshold = Number(thresholdText)
    const validCount = (value: number) =>
      Number.isInteger(value) && value >= 0 && value <= 2_147_483_647

    setError(null)
    setSuccess(null)
    if (!name || !quantityText || !thresholdText ||
        !validCount(quantity) || !validCount(lowStockThreshold)) {
      setError('Enter a name and nonnegative whole numbers for quantity and threshold.')
      return
    }

    saving.current = true
    setIsSaving(true)

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, quantity, lowStockThreshold }),
      })

      if (response.status === 409) {
        setError('An item with that name already exists.')
        return
      }
      if (response.status === 400) {
        setError('Check the name, quantity, and threshold, then try again.')
        return
      }
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const newItem = (await response.json()) as Item
      onAdded(newItem)
      form.reset()
      setSuccess(`${newItem.name} was added.`)
    } catch (caught) {
      console.error('Could not add item', caught)
      setError('Could not add the item. Check that the API is running, then try again.')
    } finally {
      saving.current = false
      setIsSaving(false)
    }
  }

  return (
    <section className="add-item-section" aria-labelledby="add-item-heading">
      <h2 id="add-item-heading">Add an item</h2>
      <form className="add-item-form" onSubmit={(event) => void handleSubmit(event)}>
        <fieldset disabled={isSaving}>
          <div className="form-field">
            <label htmlFor="item-name">Name</label>
            <input id="item-name" name="name" type="text" required />
          </div>
          <div className="form-numbers">
            <div className="form-field">
              <label htmlFor="item-quantity">Quantity</label>
              <input id="item-quantity" name="quantity" type="number" min="0" max="2147483647" step="1" defaultValue="0" required />
            </div>
            <div className="form-field">
              <label htmlFor="item-threshold">Low-stock threshold</label>
              <input id="item-threshold" name="lowStockThreshold" type="number" min="0" max="2147483647" step="1" defaultValue="0" required />
            </div>
          </div>
          <button type="submit">{isSaving ? 'Adding…' : 'Add item'}</button>
        </fieldset>
      </form>
      {error && <p className="form-message form-error" role="alert">{error}</p>}
      {success && <p className="form-message form-success" role="status">{success}</p>}
    </section>
  )
}
function App() {
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const actionPending = useRef(false)

  useEffect(() => {
    const controller = new AbortController()

    async function loadItems() {
      try {
        const response = await fetch('/api/items', { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`)
        }

        const savedItems = (await response.json()) as Item[]
        setItems(savedItems)
        setStatus('ready')
      } catch (error) {
        if (controller.signal.aborted) return
        console.error('Could not load inventory', error)
        setStatus('error')
      }
    }

    void loadItems()
    return () => controller.abort()
  }, [])

  async function handleDelete(item: Item) {
    if (actionPending.current) return

    actionPending.current = true
    setDeletingId(item.id)
    setActionError(null)

    try {
      const response = await fetch(`/api/items/${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
      })

      if (response.status === 404) {
        setItems((current) => current.filter((saved) => saved.id !== item.id))
        setActionError(`${item.name} was already removed.`)
        return
      }

      if (response.status !== 204) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      setItems((current) => current.filter((saved) => saved.id !== item.id))
    } catch (error) {
      console.error('Could not delete item', error)
      setActionError(`Could not delete ${item.name}. Please try again.`)
    } finally {
      actionPending.current = false
      setDeletingId(null)
    }
  }
  async function handleUseOne(item: Item) {
    if (actionPending.current || item.quantity === 0) return

    actionPending.current = true
    setPendingId(item.id)
    setActionError(null)

    try {
      const response = await fetch(`/api/items/${encodeURIComponent(item.id)}/use-one`, {
        method: 'POST',
      })

      if (response.status === 409) {
        setItems((current) => current.map((saved) =>
          saved.id === item.id ? { ...saved, quantity: 0 } : saved,
        ))
        return
      }

      if (response.status === 404) {
        setItems((current) => current.filter((saved) => saved.id !== item.id))
        setActionError(`${item.name} was not found. It has been removed from this list.`)
        return
      }

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`)
      }

      const updatedItem = (await response.json()) as Item
      setItems((current) => current.map((saved) =>
        saved.id === updatedItem.id ? updatedItem : saved,
      ))
    } catch (error) {
      console.error('Could not use item', error)
      setActionError(`Could not use ${item.name}. Please try again.`)
    } finally {
      actionPending.current = false
      setPendingId(null)
    }
  }

  return (
    <main className="inventory">
      <header className="inventory-header">
        <h1>Home inventory</h1>
        <p>Inspect and track your stocks</p>
        <p>Release: {(import.meta.env.VITE_RELEASE_SHA || 'local').slice(0, 7)}</p>
      </header>

      {status === 'loading' && <p role="status">Loading items…</p>}
      {status === 'error' && (
        <p role="alert">Could not load your items. Check that the API is running, then refresh this page.</p>
      )}
      {actionError && <p className="action-error" role="alert">{actionError}</p>}
      {status === 'ready' && (
        <AddItemForm onAdded={(newItem) => {
          setItems((current) => [...current, newItem].sort((a, b) => a.name.localeCompare(b.name)))
        }} />
      )}
      {status === 'ready' && items.length === 0 && <p>Your inventory is empty.</p>}
      {status === 'ready' && items.length > 0 && (
        <ul className="item-list">
          {items.map((item) => (
            <li className="item" key={item.id}>
              <div className="item-details">
                <span className="item-name">{item.name}</span>
                <span className="item-quantity">{item.quantity} in stock</span>
                {item.quantity === 0 && <span className="stock-warning">Out of stock.</span>}
                {item.quantity > 0 && item.quantity < item.lowStockThreshold && (
                  <span className="stock-warning">Low stock.</span>
                )}
              </div>
              <div className="item-actions">
                <button
                  type="button"
                  aria-label={`Use one ${item.name}`}
                  disabled={item.quantity === 0 || pendingId !== null || deletingId !== null}
                  onClick={() => void handleUseOne(item)}
                >
                  {pendingId === item.id ? 'Using…' : 'Use one'}
                </button>
                <button
                  type="button"
                  className="delete-button"
                  aria-label={`Delete ${item.name}`}
                  disabled={pendingId !== null || deletingId !== null}
                  onClick={() => void handleDelete(item)}
                >
                  {deletingId === item.id ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App
