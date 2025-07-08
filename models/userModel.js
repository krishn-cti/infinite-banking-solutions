import db from "../config/db.js";

export const findUserByEmail = (email) => {
    return new Promise((resolve, reject) => {
        const userQuery = `
            SELECT users.*, roles.name AS role_name
            FROM users
            LEFT JOIN roles ON users.role_id = roles.id
            WHERE users.email = ?
        `;

        db.query(userQuery, [email], (err, userResult) => {
            if (err) return reject(err);
            if (userResult.length === 0) return resolve(null);

            const user = userResult[0];

            // If SubAdmin, fetch permissions
            if (user.role_id === 2) {
                const permissionsQuery = `
                    SELECT p.id, p.name
                    FROM user_permissions up
                    INNER JOIN permissions p ON p.id = up.permission_id
                    WHERE up.user_id = ? AND up.status = 1 AND p.status = 1
                `;
                db.query(permissionsQuery, [user.id], (permErr, permissions) => {
                    if (permErr) return reject(permErr);

                    user.permissions = permissions || [];
                    resolve(user);
                });
            } else {
                resolve(user);
            }
        });
    });
};

export const createUser = (userData) => {
    return new Promise((resolve, reject) => {
        db.query("INSERT INTO users SET ?", userData, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
};

export const fetchUserPassword = (id) => {
    return new Promise((resolve, reject) => {
        db.query("SELECT password FROM users WHERE id = ?", [id], (err, result) => {
            if (err) return reject(err);
            if (result.length === 0) return resolve(null);
            resolve(result[0]);
        });
    });
};

export const findUserByActToken = (act_token) => {
    return new Promise((resolve, reject) => {
        db.query(
            "SELECT * FROM users WHERE act_token = ?",
            [act_token],
            (err, result) => {
                if (err) reject(err);
                if (result.length === 0) return resolve(null);
                resolve(result[0]);
            }
        );
    });
};

export const getUserById = (id) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT 
                users.*, 
                roles.name as role_name,
                creator.name AS created_by_name,
                (SELECT COUNT(*) FROM users AS u2 WHERE u2.created_by = users.id) AS user_count
            FROM users
            LEFT JOIN roles ON users.role_id = roles.id
            LEFT JOIN users AS creator ON users.created_by = creator.id
            WHERE users.id = ?
        `;
        db.query(query, [id], (err, result) => {
            if (err) reject(err);
            resolve(result[0]);
        });
    });
};

export const getUsersByRole = (roleId, search, status) => {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT 
                users.*, 
                roles.name AS role_name, 
                creator.name AS created_by_name
                ${roleId == 3 ? `, 
                (SELECT COUNT(*) FROM users u2 WHERE u2.created_by = users.id) AS user_count` : ''}
            FROM users
            LEFT JOIN roles ON users.role_id = roles.id
            LEFT JOIN users AS creator ON users.created_by = creator.id
            WHERE users.role_id = ?
        `;

        const params = [roleId];

        if (search) {
            query += ` AND (users.name LIKE ? OR users.email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (status !== '') {
            query += ` AND users.status = ?`;
            params.push(status);
        }

        db.query(query, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const getAllClients = (created_by, search, status) => {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT 
                users.*, 
                roles.name AS role_name,
                creator.name AS created_by_name
            FROM users
            LEFT JOIN roles ON users.role_id = roles.id
            LEFT JOIN users AS creator ON users.created_by = creator.id
            WHERE users.created_by = ?
        `;

        const params = [created_by];

        if (search) {
            query += ` AND (users.name LIKE ? OR users.email LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        if (status !== '' && status !== undefined && status !== null) {
            query += ` AND users.status = ?`;
            params.push(status);
        }

        db.query(query, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const updatePassword = (newPassword, show_password, id) => {
    return new Promise((resolve, reject) => {
        db.query(
            "UPDATE users SET password = ? , show_password = ? WHERE id = ?",
            [newPassword, show_password, id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

export const setNewPassword = (newPassword, showPassword, status, id) => {
    return new Promise((resolve, reject) => {
        db.query(
            "UPDATE users SET password = ? , show_password = ?, status = ? WHERE id = ?",
            [newPassword, showPassword, status, id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            }
        );
    });
};

export const updateUserProfile = async (id, userData) => {
    const fields = Object.keys(userData).map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(userData), id];

    try {
        const result = await db.promise().execute(`UPDATE users SET ${fields} WHERE id = ?`, values);
        return result[0];
    } catch (error) {
        throw error;
    }
};

export const updateStatus = async (id, status) => {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE users SET status = ? WHERE id = ?';

        db.query(query, [status, id], (err, results) => {
            if (err) {
                return reject(false);
            }

            if (results.affectedRows > 0) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
};

export const verifyUserEmail = (act_token, email_verified_at, id) => {
    return new Promise((resolve, reject) => {
        db.query(
            "Update users set act_token = ?, email_verified_at = ? where id = ? ",
            [act_token, email_verified_at, id],
            (err, result) => {
                if (err) reject(err);
                resolve(result);
            }
        );
    });
};

export const deleteUser = async (id) => {
    return new Promise((resolve, reject) => {
        const query = 'DELETE FROM users WHERE id = ?';

        db.query(query, [id], (err, results) => {
            if (err) {
                return reject(false);
            }

            resolve(results.affectedRows > 0);
        });
    });
};

export const getUserCountByRole = (roleId) => {
    return new Promise((resolve, reject) => {
        const query = "SELECT COUNT(*) AS count FROM users WHERE role_id = ?";
        db.query(query, [roleId], (err, result) => {
            if (err) return reject(err);
            resolve(result[0].count);
        });
    });
};

export const getCompletedCaseCount = (status, numberOfMonths = null) => {
    return new Promise((resolve, reject) => {
        let query = '';
        const params = [status];

        if (numberOfMonths) {
            query = `
                SELECT 
                    DATE_FORMAT(created_at, '%Y-%m') AS month,
                    COUNT(*) AS count
                FROM client_cases
                WHERE status = ?
                  AND created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
                GROUP BY month
                ORDER BY month ASC
            `;
            params.push(numberOfMonths);
        } else {
            query = `SELECT COUNT(*) AS count FROM client_cases WHERE status = ?`;
        }

        db.query(query, params, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
};

export const updateClientAssignment = async (agentId, clientIds) => {
    return new Promise((resolve, reject) => {
        const query = 'UPDATE users SET created_by = ? WHERE id IN (?) AND role_id = 4';

        db.query(query, [agentId, clientIds], (err, results) => {
            if (err) {
                return reject(err);
            }

            resolve(results); // send full result object
        });
    });
};

export const removeUserPermissions = async (subAdminId) => {
    return new Promise((resolve, reject) => {
        db.query("DELETE FROM user_permissions WHERE user_id = ?", [subAdminId], (err, results) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const insertUserPermissions = async (subAdminId, permissionIds) => {
    return new Promise((resolve, reject) => {
        const values = permissionIds.map(permission_id => [subAdminId, permission_id, 1]);
        const query = "INSERT INTO user_permissions (user_id, permission_id, status) VALUES ?";
        db.query(query, [values], (err, results) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
};

export const getPermissions = () => {
    return new Promise((resolve, reject) => {
        const query = `SELECT id, name FROM permissions WHERE status = 1 ORDER BY id DESC`;
        db.query(query, (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};

export const getPermissionsByUserId = (userId) => {
    return new Promise((resolve, reject) => {
        const query = `
            SELECT p.id, p.name
            FROM user_permissions up
            INNER JOIN permissions p ON up.permission_id = p.id
            WHERE up.user_id = ? AND up.status = 1 AND p.status = 1
        `;
        db.query(query, [userId], (err, results) => {
            if (err) return reject(err);
            resolve(results);
        });
    });
};
