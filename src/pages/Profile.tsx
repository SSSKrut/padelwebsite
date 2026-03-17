import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { EventCard } from "@/components/EventCard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Trophy, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiFetch("/.netlify/functions/profile"),
    enabled: !!user,
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) =>
      apiFetch("/.netlify/functions/profile", "PATCH", data),
    onSuccess: (data) => {
      toast({ title: "Success", description: data.message });
      queryClient.setQueryData(["profile"], (old: any) => ({ ...old, ...data.user }));
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold mb-4">You need to be logged in.</h2>
        <Button asChild><Link to="/login">Go to Login</Link></Button>
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleEditInit = () => {
    setFormData({
      firstName: profile.firstName || "",
      lastName: profile.lastName || "",
      phone: profile.phone || "",
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const myEvents = profile.registrations?.map((r: any) => r.event) || [];

  return (
    <div className="container mx-auto px-4 py-12 min-h-screen flex flex-col lg:flex-row gap-8">
      {/* Left Sidebar - Profile Form */}
      <div className="w-full lg:w-1/3">
        <Card className="sticky top-24">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>My Profile</CardTitle>
              {profile.role === "UNVERIFIED_USER" && (
                <Badge variant="destructive">Unverified</Badge>
              )}
            </div>
            <CardDescription>{profile.email}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-xl flex items-center justify-between mb-6">
              <span className="font-semibold">Current ELO:</span>
              <span className="flex items-center gap-2 font-bold text-amber-500">
                <Trophy className="w-4 h-4" /> {profile.elo}
              </span>
            </div>

            <div className="space-y-2">
              <Label>First Name</Label>
              <Input 
                value={isEditing ? formData.firstName : profile.firstName} 
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                disabled={!isEditing} 
              />
            </div>
            <div className="space-y-2">
              <Label>Last Name</Label>
              <Input 
                value={isEditing ? formData.lastName : profile.lastName} 
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                disabled={!isEditing} 
              />
            </div>
            <div className="space-y-2">
              <Label>Phone Number</Label>
              <Input 
                value={isEditing ? formData.phone : (profile.phone || "")} 
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                disabled={!isEditing} 
                placeholder="Not provided"
              />
            </div>

            <div className="pt-4">
              {isEditing ? (
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    onClick={handleSave} 
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Save
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                </div>
              ) : (
                <Button className="w-full" onClick={handleEditInit}>Edit Profile</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Content - Tabs */}
      <div className="w-full lg:w-2/3">
        <Tabs defaultValue="events" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="events">My Events</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>
          
          <TabsContent value="events" className="mt-6">
            <h3 className="text-xl font-bold mb-4">My Events</h3>
            {myEvents.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {myEvents.map((event: any) => (
                  <div key={event.id} className={event.status === "ARCHIVED" ? "opacity-75" : ""}>
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-muted/50 rounded-xl">
                <p className="text-muted-foreground mb-4">You haven't registered for any events yet.</p>
                <Button asChild><Link to="/events">Browse Events</Link></Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="achievements" className="mt-6">
             <h3 className="text-xl font-bold mb-4">My Achievements</h3>
             {profile.achievements?.length > 0 ? (
                <div className="grid sm:grid-cols-2 gap-4">
                   {profile.achievements.map((ua: any) => (
                     <Card key={ua.id} className="flex flex-row items-center p-4 gap-4">
                       <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-primary/10 rounded-full text-2xl">
                         {ua.achievement.icon || "🏆"}
                       </div>
                       <div>
                         <h4 className="font-bold">{ua.achievement.title}</h4>
                         <p className="text-xs text-muted-foreground">{ua.achievement.description}</p>
                         <p className="text-xs text-muted-foreground mt-1">
                           Awarded: {new Date(ua.dateAwarded).toLocaleDateString()}
                         </p>
                       </div>
                     </Card>
                   ))}
                </div>
             ) : (
                <div className="text-center py-12 bg-muted/50 rounded-xl">
                  <p className="text-muted-foreground">You don't have any achievements yet. Keep playing!</p>
                </div>
             )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Profile;
