import { ReactNode } from "react";
import { useTheme } from "next-themes";
import { AppShell, PageHeader, Section } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, User, Bell, Shield, Database } from "lucide-react";

/** One row of a settings group: label, explanation, and its control */
function SettingRow({
  title,
  description,
  control,
}: {
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <div className="min-w-0">
        <div className="text-[13px] font-medium text-foreground">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

const Settings = () => {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description="Manage your EagleSight preferences and configuration"
        icon={<SettingsIcon />}
      />

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="data">Data &amp; API</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Section title="Profile" actions={<User className="h-4 w-4 text-muted-foreground" />}>
            <div className="grid max-w-xl gap-4">
              <Field id="company" label="Company name">
                <Input id="company" defaultValue="AgriTech Solutions Nigeria" />
              </Field>
              <Field id="email" label="Contact email">
                <Input id="email" type="email" defaultValue="fleet@agritech.ng" />
              </Field>
              <Field id="timezone" label="Timezone">
                <Input id="timezone" defaultValue="Africa/Lagos" />
              </Field>
              <div><Button size="sm">Save changes</Button></div>
            </div>
          </Section>

          <Section title="Display">
            {/* This switch used to be decorative - there was no theme provider
                mounted for it to talk to. It drives the real theme now. */}
            <SettingRow
              title="Dark mode"
              description="Dark suits a control room; light is more readable outdoors"
              control={
                <Switch
                  checked={resolvedTheme === "dark"}
                  onCheckedChange={(on) => setTheme(on ? "dark" : "light")}
                  aria-label="Toggle dark mode"
                />
              }
            />
            <SettingRow
              title="High contrast"
              description="Increase visual contrast"
              control={<Switch />}
            />
            <SettingRow
              title="Compact view"
              description="Show more data in less space"
              control={<Switch />}
            />
          </Section>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Section title="Alert preferences" actions={<Bell className="h-4 w-4 text-muted-foreground" />}>
            <SettingRow title="Critical alerts" description="Immediate notification on system failures" control={<Switch defaultChecked />} />
            <SettingRow title="Maintenance warnings" description="Predictive maintenance alerts" control={<Switch defaultChecked />} />
            <SettingRow title="Fuel efficiency reports" description="Weekly consumption summaries" control={<Switch defaultChecked />} />
            <SettingRow title="Daily digest" description="Fleet status summary every morning" control={<Switch />} />
          </Section>

          <Section title="Channels">
            <SettingRow title="Email" description="Receive alerts by email" control={<Switch defaultChecked />} />
            <SettingRow title="SMS" description="Critical alerts by text message" control={<Switch defaultChecked />} />
            <SettingRow title="Push" description="Browser push notifications" control={<Switch />} />
          </Section>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Section title="Password" actions={<Shield className="h-4 w-4 text-muted-foreground" />}>
            <div className="grid max-w-xl gap-4">
              <Field id="current-password" label="Current password">
                <Input id="current-password" type="password" autoComplete="current-password" />
              </Field>
              <Field id="new-password" label="New password">
                <Input id="new-password" type="password" autoComplete="new-password" />
              </Field>
              <Field id="confirm-password" label="Confirm new password">
                <Input id="confirm-password" type="password" autoComplete="new-password" />
              </Field>
              <div><Button size="sm">Update password</Button></div>
            </div>
          </Section>

          <Section title="Two-factor authentication">
            <SettingRow title="Enable 2FA" description="Require a second factor at sign-in" control={<Switch />} />
          </Section>
        </TabsContent>

        <TabsContent value="data" className="space-y-4">
          <Section title="API configuration" actions={<Database className="h-4 w-4 text-muted-foreground" />}>
            <div className="grid max-w-xl gap-4">
              <Field id="api-key" label="API key">
                <Input id="api-key" type="password" defaultValue="••••••••••••••••" />
              </Field>
              <Field id="api-endpoint" label="API endpoint">
                <Input id="api-endpoint" defaultValue="https://api.eaglesight.ng/v1" />
              </Field>
              <div><Button variant="outline" size="sm">Regenerate API key</Button></div>
            </div>
          </Section>

          <Section title="Data management">
            <SettingRow title="Auto-sync telemetry" description="Continuously sync machine data" control={<Switch defaultChecked />} />
            <SettingRow title="Data retention" description="Keep historical data for 90 days" control={<Switch defaultChecked />} />
            <div className="mt-4 border-t border-border pt-4">
              <Button variant="outline" size="sm" className="w-full sm:w-auto">Export all data</Button>
            </div>
          </Section>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
};

export default Settings;
