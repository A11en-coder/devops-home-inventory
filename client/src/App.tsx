import { useEffect, useRef, useState } from 'react'
import './App.css'

type Item = {
  id: string
  name: string
  quantity: number
  lowStockThreshold: number
}

function App() {
  const [items, setItems] = useState<Item[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [pendingId, setPendingId] = useState<string | null>(null)
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
        <p>See what you have in stock.</p>
      </header>

      {status === 'loading' && <p role="status">Loading items…</p>}
      {status === 'error' && (
        <p role="alert">Could not load your items. Check that the API is running, then refresh this page.</p>
      )}
      {actionError && <p className="action-error" role="alert">{actionError}</p>}
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
              <button
                type="button"
                aria-label={`Use one ${item.name}`}
                disabled={item.quantity === 0 || pendingId !== null}
                onClick={() => void handleUseOne(item)}
              >
                {pendingId === item.id ? 'Using…' : 'Use one'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

export default App
