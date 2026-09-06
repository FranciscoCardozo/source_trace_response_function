import { Request, Response } from "express";
import debugLib from 'debug';
import DatabasePort from "../../ports/databasePort/database.port";


const debug = debugLib('response:statusAdapter');

export default class StatusAdapter{
    public static async getStatusAnalysis(req: Request, res: Response): Promise<void> {
        try {
            const headers = req.headers;
            debug('Get status analysis request received, headers: %O', headers);

            const job = "JOB#" + headers['x-job-id'];
            const process = headers['x-process'] as string;

            const response = await DatabasePort.getItems({ PK: job, SK: process });
            debug('Status analysis response: %O', response);
            res.json(response);
        } catch (error) {
            debug('Error occurred while fetching status analysis');
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}