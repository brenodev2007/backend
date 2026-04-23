import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireAdmin } from '../middlewares/access.middleware';

const router = Router();

// Todas as rotas de admin requerem autenticação e serem admin
router.use(authMiddleware);
router.use(requireAdmin);

router.get('/users', AdminController.listUsers);
router.patch('/users/:id/status', AdminController.toggleUserStatus);

export default router;
