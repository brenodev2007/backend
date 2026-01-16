import { Router } from 'express';
import { WarehouseController } from '../controllers/warehouse.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { checkWarehouseLimit } from '../middlewares/planRestriction.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', WarehouseController.getAll);
router.post('/', checkWarehouseLimit, WarehouseController.create);
router.put('/:id', WarehouseController.update);
router.delete('/:id', WarehouseController.delete);

export default router;
