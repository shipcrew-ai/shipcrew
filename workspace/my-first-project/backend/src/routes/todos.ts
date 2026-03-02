import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../db';

const router = Router();

// ─── GET /todos ───────────────────────────────────────────────────────────────
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const todos = await prisma.todo.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(todos);
  } catch (err) {
    next(err);
  }
});

// ─── POST /todos ──────────────────────────────────────────────────────────────
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { title } = req.body as { title?: string };

    if (!title || title.trim() === '') {
      res.status(400).json({ error: 'title is required' });
      return;
    }

    const todo = await prisma.todo.create({
      data: { title: title.trim(), completed: false },
    });

    res.status(201).json(todo);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /todos/:id ─────────────────────────────────────────────────────────
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }

    const { title, completed } = req.body as {
      title?: string;
      completed?: boolean;
    };

    if (title !== undefined && title.trim() === '') {
      res.status(400).json({ error: 'title cannot be blank' });
      return;
    }

    const todo = await prisma.todo.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(completed !== undefined && { completed }),
      },
    });

    res.json(todo);
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    ) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    next(err);
  }
});

// ─── DELETE /todos/:id ────────────────────────────────────────────────────────
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Number(req.params.id);
    if (isNaN(id)) {
      res.status(400).json({ error: 'Invalid id' });
      return;
    }

    await prisma.todo.delete({ where: { id } });
    res.status(204).send();
  } catch (err: unknown) {
    if (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === 'P2025'
    ) {
      res.status(404).json({ error: 'Todo not found' });
      return;
    }
    next(err);
  }
});

export default router;
