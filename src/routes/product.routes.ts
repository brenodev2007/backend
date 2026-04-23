import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireActive } from '../middlewares/access.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireActive);

router.get('/', ProductController.getAll);
router.post('/', ProductController.create);
router.put('/:id', ProductController.update);
router.delete('/:id', ProductController.delete);

export default router;
