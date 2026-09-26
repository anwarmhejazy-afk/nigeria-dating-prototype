export type Profile = {
  id: number;
  name: string;
  age: number;
  location: string;
  country: string;
  tribe: string;
  distance: string;
  verified: boolean;
  online: boolean;
  joined: string;
  interests: string[];
  bio: string;
  image: string;
  occupation: string;
  education: string;
  religion: string;
  height: string;
  languages: string[];
  lifestyle: string;
  lookingFor: string;
  compatibility: number;
};

export const profiles: Profile[] = [];

export const notifications = [
  {
    id: 1,
    title: "New profile view",
    text: "Someone viewed your profile.",
    time: "2m",
  },
  {
    id: 2,
    title: "You have a new like",
    text: "Upgrade to see who liked you.",
    time: "18m",
  },
  {
    id: 3,
    title: "Top Pick refreshed",
    text: "Your daily Top Picks are ready.",
    time: "1h",
  },
];
