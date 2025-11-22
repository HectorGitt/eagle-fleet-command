import { DashboardSidebar } from "@/components/DashboardSidebar";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings as SettingsIcon, User, Bell, Shield, Database } from "lucide-react";

const Settings = () => {
  return (
    <div className="flex min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <DashboardSidebar />
      
      <div className="flex-1 flex flex-col ml-64">
        <TopBar />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <SettingsIcon className="w-8 h-8 text-primary" />
              <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            </div>
            <p className="text-muted-foreground">Manage your EagleView dashboard preferences and configuration</p>
          </div>

          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="glass-panel">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="data">Data & API</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <Card className="glass-panel p-6">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Profile Settings</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="company">Company Name</Label>
                    <Input id="company" defaultValue="AgriTech Solutions Nigeria" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Contact Email</Label>
                    <Input id="email" type="email" defaultValue="fleet@agritech.ng" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input id="timezone" defaultValue="Africa/Lagos" />
                  </div>
                  <Button>Save Changes</Button>
                </div>
              </Card>

              <Card className="glass-panel p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Display Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Dark Mode</div>
                      <div className="text-sm text-muted-foreground">Use dark theme for dashboard</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">High Contrast</div>
                      <div className="text-sm text-muted-foreground">Increase visual contrast</div>
                    </div>
                    <Switch />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Compact View</div>
                      <div className="text-sm text-muted-foreground">Show more data in less space</div>
                    </div>
                    <Switch />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="notifications" className="space-y-6">
              <Card className="glass-panel p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Bell className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Alert Preferences</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Critical Alerts</div>
                      <div className="text-sm text-muted-foreground">Immediate notifications for system failures</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Maintenance Warnings</div>
                      <div className="text-sm text-muted-foreground">Predictive maintenance alerts</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Fuel Efficiency Reports</div>
                      <div className="text-sm text-muted-foreground">Weekly fuel consumption summaries</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Daily Digest</div>
                      <div className="text-sm text-muted-foreground">Fleet status summary every morning</div>
                    </div>
                    <Switch />
                  </div>
                </div>
              </Card>

              <Card className="glass-panel p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Notification Channels</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Email Notifications</div>
                      <div className="text-sm text-muted-foreground">Receive alerts via email</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">SMS Alerts</div>
                      <div className="text-sm text-muted-foreground">Critical alerts via SMS</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Push Notifications</div>
                      <div className="text-sm text-muted-foreground">Browser push notifications</div>
                    </div>
                    <Switch />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card className="glass-panel p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Shield className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">Security Settings</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input id="current-password" type="password" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input id="new-password" type="password" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input id="confirm-password" type="password" />
                  </div>
                  <Button>Update Password</Button>
                </div>
              </Card>

              <Card className="glass-panel p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Two-Factor Authentication</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Enable 2FA</div>
                      <div className="text-sm text-muted-foreground">Add extra security to your account</div>
                    </div>
                    <Switch />
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="data" className="space-y-6">
              <Card className="glass-panel p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5 text-primary" />
                  <h3 className="text-lg font-bold text-foreground">API Configuration</h3>
                </div>
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input id="api-key" type="password" defaultValue="••••••••••••••••" />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="api-endpoint">API Endpoint</Label>
                    <Input id="api-endpoint" defaultValue="https://api.eagleview.ng/v1" />
                  </div>
                  <Button variant="outline">Regenerate API Key</Button>
                </div>
              </Card>

              <Card className="glass-panel p-6">
                <h3 className="text-lg font-bold text-foreground mb-4">Data Management</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Auto-sync Telemetry</div>
                      <div className="text-sm text-muted-foreground">Automatically sync tractor data</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-foreground">Data Retention</div>
                      <div className="text-sm text-muted-foreground">Keep historical data for 90 days</div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <Button variant="outline" className="w-full">Export All Data</Button>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default Settings;
