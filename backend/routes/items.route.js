const express = require("express");
const router = express.Router();

// In-memory store for demo only
let items = [
  { id: 1, name: "Sample Item 1" },
  { id: 2, name: "Sample Item 2" },
];
let nextId = 3;

/**
 * @openapi
 * /api/items:
 *   get:
 *     summary: List all items
 *     tags: [Items]
 *     responses:
 *       200:
 *         description: A list of items
 *   post:
 *     summary: Create a new item
 *     tags: [Items]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created item
 */
router.get("/", (req, res) => {
  res.json(items);
});

router.post("/", (req, res) => {
  const { name } = req.body || {};
  if (!name || typeof name !== "string") {
    return res.status(400).json({ message: "'name' is required" });
  }
  const newItem = { id: nextId++, name };
  items.push(newItem);
  res.status(201).json(newItem);
});

/**
 * @openapi
 * /api/items/{id}:
 *   get:
 *     summary: Get an item by id
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Found item
 *       404:
 *         description: Item not found
 *   put:
 *     summary: Update an item by id
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Updated item
 *       404:
 *         description: Item not found
 *   delete:
 *     summary: Delete an item by id
 *     tags: [Items]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       204:
 *         description: Deleted
 *       404:
 *         description: Item not found
 */
router.get("/:id", (req, res) => {
  const id = Number(req.params.id);
  const item = items.find((i) => i.id === id);
  if (!item) return res.status(404).json({ message: "Not found" });
  res.json(item);
});

router.put("/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name } = req.body || {};
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return res.status(404).json({ message: "Not found" });
  if (!name || typeof name !== "string") {
    return res.status(400).json({ message: "'name' is required" });
  }
  items[index] = { id, name };
  res.json(items[index]);
});

router.delete("/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return res.status(404).json({ message: "Not found" });
  items.splice(index, 1);
  res.status(204).send();
});

module.exports = router;


