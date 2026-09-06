import { Request, Response } from "express";
import debugLib from 'debug';
import DatabasePort from "../../ports/databasePort/database.port";
import {
    EVIDENCE_SK_PREFIX,
    EvidenceSummary,
    METADATA_SK,
} from "../../domain/models/dynamo/jobMetadata.interface";


const debug = debugLib('response:statusAdapter');

export default class StatusAdapter{
    public static async getStatusAnalysis(req: Request, res: Response): Promise<void> {
        try {
            const headers = req.headers;
            debug('Get status analysis request received, headers: %O', headers);

            const job = "JOB#" + headers['x-job-id'];

            // Traemos todos los registros que cuelgan del job (padre): METADATA + EVIDENCE#*.
            const response = await DatabasePort.getItems({ PK: job });
            const items = response.Items ?? [];

            const metadata = items.find((item) => item.SK === METADATA_SK);
            if (!metadata) {
                debug('Metadata not found for job %s', job);
                res.status(404).json({ error: 'Metadata not found' });
                return;
            }

            const evidences: EvidenceSummary[] = items
                .filter((item) => typeof item.SK === 'string' && item.SK.startsWith(EVIDENCE_SK_PREFIX))
                .map((item) => ({
                    key: item.s3Key ?? item.key ?? (Array.isArray(item.paths) ? item.paths[0] : undefined),
                    label: item.label,
                }));

            const result = { ...metadata, evidences };
            debug('Status analysis response: %O', result);
            res.json(result);
        } catch (error) {
            debug('Error occurred while fetching status analysis');
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
