export interface Config {
  jwt?: string;
  user?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface DNSRecord {
  type: "A" | "AAAA" | "CNAME" | "TXT" | "MX";
  value: string | MXValue;
}

export interface MXValue {
  priority: number;
  exchange: string;
}

export interface RecordFile {
  description: string;
  owner: {
    github_username?: string;
    email: string;
  };
  record: DNSRecord[];
}

export interface Subdomain {
  subdomainId: string;
  subdomainName: string;
  description: string;
  record: DNSRecord[];
  ownerId: string;
}

export interface HostingResponse {
  subdomain: string;
  url: string;
  fileCount: number;
  totalSize: number;
}

export interface HostingStatus {
  subdomain: string;
  url: string;
  fileCount: number;
  totalSize: number;
  lastDeployedAt: string;
}
