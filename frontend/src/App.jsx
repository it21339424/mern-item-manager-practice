import { useEffect, useState } from "react";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

async function request(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export default function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [category, setCategory] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;

    request("/api/items")
      .then((data) => {
        if (active) setItems(data);
      })
      .catch((err) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function resetForm() {
    setName("");
    setQuantity("");
    setCategory("");
    setEditingId(null);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const amount = Number(quantity);

    if (
      !name.trim() ||
      !category.trim() ||
      quantity.trim() === "" ||
      !Number.isInteger(amount) ||
      amount < 0
    ) {
      setError("Enter a name and a whole quantity of 0 or more.");
      return;
    }

    setBusy(true);

    try {
      const saved = await request(
        editingId ? `/api/items/${editingId}` : "/api/items",
        {
          method: editingId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            quantity: amount,
            category: category.trim(),
          }),
        }
      );

      if (editingId) {
        setItems((current) =>
          current.map((item) => (item._id === saved._id ? saved : item))
        );
        setMessage("Item updated successfully.");
      } else {
        setItems((current) => [saved, ...current]);
        setMessage("Item added successfully.");
      }

      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function editItem(item) {
    setEditingId(item._id);
    setName(item.name);
    setQuantity(String(item.quantity));
    setCategory(item.category || "");
    setError("");
    setMessage("");
  }

  async function deleteItem(item) {
    if (!window.confirm(`Delete "${item.name}"?`)) return;

    setBusy(true);
    setError("");
    setMessage("");

    try {
      await request(`/api/items/${item._id}`, { method: "DELETE" });

      setItems((current) =>
        current.filter((entry) => entry._id !== item._id)
      );

      if (editingId === item._id) resetForm();

      setMessage("Item deleted successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <h1>Item Manager</h1>
      <p>Add, view, edit and delete your items.</p>

      <section className="card">
        <h2>{editingId ? "Edit Item" : "Add Item"}</h2>

        <form onSubmit={handleSubmit}>
          <label htmlFor="name">Item Name</label>
          <input
            id="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Example: Notebook"
            required
            disabled={busy}
          />

          <label htmlFor="category">Category</label>
          <input 
            id = "category"
            value = {category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Example: Stationery"
            required
            disabled = {busy}
          />

          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            type="number"
            min="0"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
            disabled={busy}
          />

          <div className="actions">
            <button disabled={busy || loading} type="submit">
              {busy ? "Please wait..." : editingId ? "Update Item" : "Add Item"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary"
                onClick={resetForm}
                disabled={busy}
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {error && <p className="error" role="alert">{error}</p>}
        {message && <p className="success" role="status">{message}</p>}
      </section>

      <section className="card">
        <h2>Items ({items.length})</h2>

        {loading ? (
          <p>Loading items...</p>
        ) : items.length === 0 ? (
          <p>No items to display.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Item Name</th>
                  <th>Quantity</th>
                  <th>Category</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>{item.name}</td>
                    <td>{item.category || "Not set"}</td>
                    <td>{item.quantity}</td>
                    <td>
                      <div className="actions">
                        <button
                          type="button"
                          onClick={() => editItem(item)}
                          disabled={busy}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger"
                          onClick={() => deleteItem(item)}
                          disabled={busy}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}