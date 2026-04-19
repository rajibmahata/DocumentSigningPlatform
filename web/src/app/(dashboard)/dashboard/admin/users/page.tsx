'use client';

import { useEffect, useState } from 'react';
import { userApi } from '@/lib/api';
import { useAuth } from '@/providers/auth-provider';
import type { UserResponse, AccessRole } from '@/types';
import { Pencil, Check, X, UserCheck, UserX } from 'lucide-react';

const ROLE_COLORS: Record<AccessRole, string> = {
  Admin:  'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  User:   'bg-blue-100   text-blue-800   dark:bg-blue-900   dark:text-blue-200',
  Viewer: 'bg-gray-100   text-gray-700   dark:bg-gray-700   dark:text-gray-300',
};

function StatusBadge({ user }: { user: UserResponse }) {
  if (!user.isActive && user.accessRole === 'Admin')
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">Pending Approval</span>;
  if (!user.isActive)
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">Inactive</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Active</span>;
}

export default function AdminUsersPage() {
  const { user: me } = useAuth();
  const [users,         setUsers]         = useState<UserResponse[]>([]);
  const [pendingAdmins, setPendingAdmins] = useState<UserResponse[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [editing,       setEditing]       = useState<string | null>(null);
  const [roleVal,       setRoleVal]       = useState<AccessRole>('User');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (me?.accessRole !== 'Admin') return;
    Promise.all([
      userApi.getAll(),
      userApi.getPendingAdmins(),
    ])
      .then(([allRes, pendingRes]) => {
        setUsers(allRes.data);
        setPendingAdmins(pendingRes.data);
      })
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

  async function activateUser(id: string) {
    setActionLoading(id);
    try {
      const res = await userApi.activate(id);
      const updated = res.data;
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
      setPendingAdmins(prev => prev.filter(u => u.id !== id));
    } catch {
      alert('Failed to activate user.');
    } finally {
      setActionLoading(null);
    }
  }

  async function deactivateUser(id: string) {
    setActionLoading(id);
    try {
      const res = await userApi.deactivate(id);
      const updated = res.data;
      setUsers(prev => prev.map(u => u.id === id ? updated : u));
    } catch {
      alert('Failed to deactivate user.');
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>

      {loading && <p className="text-gray-500 animate-pulse">Loading users…</p>}
      {error   && <p className="text-red-500">{error}</p>}

      {/* ── Pending Admin Approvals ── */}
      {!loading && pendingAdmins.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 space-y-4">
          <h2 className="text-base font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-2">
            ⏳ Pending Admin Approvals
            <span className="bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100 rounded-full px-2 py-0.5 text-xs font-bold">
              {pendingAdmins.length}
            </span>
          </h2>
          <div className="space-y-2">
            {pendingAdmins.map(u => (
              <div key={u.id} className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{u.name}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{u.email}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Registered {new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
                <button
                  onClick={() => activateUser(u.id)}
                  disabled={actionLoading === u.id}
                  className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <UserCheck className="h-4 w-4" />
                  {actionLoading === u.id ? 'Activating…' : 'Approve'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── All Users Table ── */}
      {!loading && !error && (
        <div className="overflow-x-auto bg-white dark:bg-gray-800 rounded-2xl shadow">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
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
                    <StatusBadge user={u} />
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
                    <div className="flex items-center gap-1">
                      {/* Edit role */}
                      {editing === u.id ? (
                        <>
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
                        </>
                      ) : (
                        <button
                          onClick={() => { setEditing(u.id); setRoleVal(u.accessRole); }}
                          className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900"
                          title="Edit role"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      )}
                      {/* Activate / Deactivate (not self) */}
                      {u.id !== me?.id && (
                        u.isActive ? (
                          <button
                            onClick={() => deactivateUser(u.id)}
                            disabled={actionLoading === u.id}
                            className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900 disabled:opacity-50"
                            title="Deactivate user"
                          >
                            <UserX className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => activateUser(u.id)}
                            disabled={actionLoading === u.id}
                            className="p-1 rounded text-green-600 hover:bg-green-50 dark:hover:bg-green-900 disabled:opacity-50"
                            title="Activate user"
                          >
                            <UserCheck className="h-4 w-4" />
                          </button>
                        )
                      )}
                    </div>
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
'use c