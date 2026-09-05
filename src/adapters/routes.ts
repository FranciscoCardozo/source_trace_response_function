import { Router } from "express";
import StatusAdapter from "./statusAdapter/status.adapter";

const router = Router();

router.get("/V1/product/status/analysis", async (req, res) => {
    return await StatusAdapter.getStatusAnalysis(req, res);
});


export default router;
