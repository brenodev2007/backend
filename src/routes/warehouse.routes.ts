import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouse.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { requireActive } from '../middlewares/access.middleware';

const router = Router();

router.use(authMiddleware);
router.use(requireActive);

router.get('/', WarehouseController.getAll);
router.post('/', WarehouseController.create);
router.put('/:id', WarehouseController.update);
router.delete('/:id', WarehouseController.delete);

export default router;
