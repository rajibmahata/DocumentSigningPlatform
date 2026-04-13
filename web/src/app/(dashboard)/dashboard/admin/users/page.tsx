'use client';

import { useEffect, useState } from 'react';
import { userApi } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import type { UserResponse, AccessRole } from '@/types';
import { Pencil, Check, X } from 'lucide-react';

const ROLE_COLORS: Record<AccessRole, string> = {
  Admin:  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  User:   'bg-blue-100   text-blue-800   dark:bg-blue-900   dark:text-blue-200',
  Viewer: 'bg-gray-100   text-gray-700   dark:bg-gray-700   dark:text-gray-300',
};

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users,   setUsers]   = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [roleVal, setRoleVal] = useState<AccessRole>('User');

  useEffect(() => {
    if (me?.accessRole !== 'Admin') return;
    userApi.getAll()
      .then(r => setUsers(r.data))
      .catch(() => setError('Failed to load users.'))
      .finally(() => setLoading(false));
  }, [me]);

  if (me?.accessRole !== 'Admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">You do not have permission to view this page.</p>
      </div>
    );
  }

  async function saveRole(id: string) {
    try {
      const res = await userApi.update(id, { accessRole: roleVal as AccessRole });
      setUsers(prev => prev.map(u => u.id === id ? res.data : u));
    } catch {
      alert('Failed to update role.');
    } finally {
      setEditing(null);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>

      {loading && <p className="text-gray-500 animate-pulse">Loading users…</p>}
      {error   && <p className="text-red-500">{error}</p>}

      {!loading && !error && (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-2xl shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Verified</th>
                <th className="px-4 py-3 text-left">Joined</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr
                  key={u.id}
                  className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{u.email}</td>
                  <td className="px-4 py-3">
                    {editing === u.id ? (
                      <select
                        value={roleVal}
                        onChange={e => setRoleVal(e.target.value as AccessRole)}
                        className="border rounded px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        {(['User', 'Admin', 'Viewer'] as AccessRole[]).map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[u.accessRole]}`}>
                        {u.accessRole}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.isEmailVerified
                      ? <Check className="h-4 w-4 text-green-500" />
                      : <X className="h-4 w-4 text-red-400" />}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {editing === u.id ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveRole(u.id)}
                          className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditing(null)}
                          className="p-1 rounded text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditing(u.id); setRoleVal(u.accessRole); }}
                        className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900"
                        title="Edit role"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-3">{users.length} user{users.length !== 1 ? 's' : ''} total</p>
        </div>
      )}
    </div>
  );
}
