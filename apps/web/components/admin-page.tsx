"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ShieldIcon, LockIcon } from "lucide-react";

type User = {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  createdAt: string;
};

export function AdminPage() {
  const { data: session, isPending } = useSession();
  const isAdmin = session?.user?.role === "admin";

  if (isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!isAdmin) {
    return <AdminGate />;
  }

  return <AdminDashboard />;
}

function AdminGate() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to verify");
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <LockIcon className="size-5 text-muted-foreground" />
          </div>
          <CardTitle className="text-lg">Admin Access</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Enter the admin password to access this page.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="password"
              placeholder="Admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying..." : "Unlock"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [allowedDomains, setAllowedDomains] = useState("");
  const [domainsInput, setDomainsInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roleDialog, setRoleDialog] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState("user");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin");
      const data = await res.json();
      setUsers(data.users ?? []);
      setAllowedDomains(data.allowedDomains ?? "");
      setDomainsInput(data.allowedDomains ?? "");
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function saveDomains() {
    setSaving(true);
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_domains", domains: domainsInput }),
    });
    setAllowedDomains(domainsInput);
    setSaving(false);
  }

  async function setRole(userId: string, role: string) {
    await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_role", userId, role }),
    });
    setRoleDialog(null);
    refresh();
  }

  // Only show saved domains as badges, not the live input
  const savedDomainsList = allowedDomains
    ? allowedDomains.split(",").map((d) => d.trim()).filter(Boolean)
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldIcon className="size-6 text-muted-foreground" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Manage users, roles, and access controls.
          </p>
        </div>
      </div>

      {/* Allowed Domains */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Allowed Email Domains</CardTitle>
          <p className="text-sm text-muted-foreground">
            Restrict sign-ups to specific email domains. Leave empty to allow
            all domains. Comma-separated.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              value={domainsInput}
              onChange={(e) => setDomainsInput(e.target.value)}
              placeholder="e.g. company.com, team.org"
              className="flex-1"
            />
            <Button
              onClick={saveDomains}
              disabled={saving || domainsInput === allowedDomains}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
          {savedDomainsList.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {savedDomainsList.map((d) => (
                <Badge key={d} variant="secondary" className="gap-1 pr-1">
                  {d}
                  <button
                    onClick={() => {
                      const updated = savedDomainsList
                        .filter((x) => x !== d)
                        .join(", ");
                      setDomainsInput(updated);
                      // Auto-save the removal
                      setSaving(true);
                      fetch("/api/admin", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "set_domains", domains: updated }),
                      }).then(() => {
                        setAllowedDomains(updated);
                        setSaving(false);
                      });
                    }}
                    className="ml-0.5 rounded-full hover:bg-foreground/10 p-0.5"
                  >
                    <span className="text-[10px] leading-none">✕</span>
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">
            Users
            {!loading && (
              <span className="text-muted-foreground font-normal ml-2">
                ({users.length})
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">
                            {user.name ?? "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "admin" ? "default" : "secondary"
                          }
                          className="text-xs cursor-pointer"
                          onClick={() => {
                            setRoleDialog(user);
                            setSelectedRole(user.role ?? "user");
                          }}
                        >
                          {user.role ?? "user"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Role change dialog */}
      <Dialog
        open={!!roleDialog}
        onOpenChange={(open) => !open && setRoleDialog(null)}
      >
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update role for{" "}
              <strong>{roleDialog?.name ?? roleDialog?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <Select value={selectedRole} onValueChange={setSelectedRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="user">User</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <DialogClose className="inline-flex items-center justify-center rounded-lg h-8 px-3 text-sm font-medium border border-input bg-background hover:bg-muted transition-colors">
              Cancel
            </DialogClose>
            <Button
              size="sm"
              onClick={() => roleDialog && setRole(roleDialog.id, selectedRole)}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
