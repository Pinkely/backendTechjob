import db from '../config/db.js';

export const getAllEmployeesWithHistory = async (req, res) => {
    try {
        const [employees] = await db.execute('SELECT * FROM technicians');
        const [workHistory] = await db.execute(`
            SELECT wa.technician_id, w.* FROM work_assign wa 
            JOIN work w ON wa.work_id = w.id 
            WHERE w.status != 'Draft'
        `);
        res.json({ employees, workHistory });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getFinancialReport = async (req, res) => {
    const { year } = req.query;
    try {
        const query = `
            SELECT 
                w.id, w.namework, w.datework, w.money AS income,
                COALESCE(SUM(we.cost), 0) AS total_cost,
                (w.money - COALESCE(SUM(we.cost), 0)) AS profit
            FROM work w
            LEFT JOIN work_expense we ON w.id = we.work_id
            WHERE YEAR(w.datework) = ? AND w.status != 'Draft'
            GROUP BY w.id
        `;
        const [records] = await db.execute(query, [year]);
        res.json(records);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getMaterialUsage = async (req, res) => {
    try {
        const query = `
            SELECT 
                mr.id AS requestId, m.name AS materialName, mr.amount AS usedAmount,
                w.namework AS jobName, w.id AS jobId, t.name AS technician, mr.request_date AS date
            FROM material_request mr
            JOIN material m ON mr.material_id = m.id
            JOIN work w ON mr.work_id = w.id
            JOIN technicians t ON mr.technician_id = t.id
            ORDER BY mr.request_date DESC
        `;
        const [usage] = await db.execute(query);
        res.json(usage);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};