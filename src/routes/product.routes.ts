import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { checkProductLimit } from '../middlewares/planRestriction.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', ProductController.getAll);
router.post('/', checkProductLimit, ProductController.create);
router.put('/:id', ProductController.update);
router.delete('/:id', ProductController.delete);

export default router;
