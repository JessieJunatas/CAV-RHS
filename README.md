<div align="center">

<br />

```
 ██████╗ █████╗ ██╗   ██╗    ██████╗ ██╗  ██╗███████╗
██╔════╝██╔══██╗██║   ██║    ██╔══██╗██║  ██║██╔════╝
██║     ███████║██║   ██║    ██████╔╝███████║███████╗
██║     ██╔══██║╚██╗ ██╔╝    ██╔══██╗██╔══██║╚════██║
╚██████╗██║  ██║ ╚████╔╝     ██║  ██║██║  ██║███████║
 ╚═════╝╚═╝  ╚═╝  ╚═══╝      ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝
```

### Certification, Authentication & Verification System
### Rizal High School — Registrar's Office

<br />

![TypeScript](https://img.shields.io/badge/TypeScript-96.6%25-3178C6?style=flat-square&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-latest-646CFF?style=flat-square&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-backend-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

<br />

</div>

---

## What is CAV-RHS?

CAV-RHS is an internal records management system built for the Registrar's Office of Rizal High School. It streamlines the creation, tracking, and generation of official **CAV (Certification, Authentication and Verification)** documents — replacing manual paperwork with a fast, digital workflow.

Staff can fill out CAV forms, instantly preview the auto-filled official 4-page PDF template, download it, and manage all records from a central dashboard — all with full audit logging and multi-user support.

---

## ✨ Features

<table>
<tr>
<td width="50%">

**📋 CAV Form**
Fill and submit CAV records with real-time field validation, progress tracking, and a live PDF preview before download.

**📄 PDF Generation**
Auto-fills a 4-page official CAV template using `pdf-lib` with coordinate-precise text placement and dynamic font sizing.

**🔍 Records Dashboard**
Paginated, searchable, and sortable data table showing all submitted records with quick access to view, edit, or archive.

**📦 Archive & Restore**
Soft-archive records to keep history clean. Restore or permanently delete — individually or in bulk with multi-select.

</td>
<td width="50%">

**🔐 Authentication**
Supabase-powered login with RLS policies ensuring all authenticated staff share access to the same global dataset.

**📝 Audit Logging**
Every create, update, restore, and delete action is logged with the record ID and relevant data for accountability.

**🌙 Dark Mode**
Full light/dark theme support across every component, including the custom date picker and PDF preview panel.

**📅 Smart Date Picker**
Custom calendar with dedicated month and year grid navigation — no native browser picker, fully themed.

</td>
</tr>
</table>

---

## 🛠 Tech Stack

| | Technology | Purpose |
|---|---|---|
| ⚛️ | **React 18 + TypeScript** | UI framework |
| ⚡ | **Vite** | Build tool with HMR |
| 🎨 | **Tailwind CSS v4** | Utility-first styling |
| 🧩 | **shadcn/ui** | Accessible UI components |
| 🗄️ | **Supabase** | Database, auth, and RLS |
| 📄 | **pdf-lib** | PDF template filling & generation |
| 🧭 | **React Router v6** | Client-side routing |
| 📊 | **TanStack Table v8** | Headless data table with pagination |
| 📅 | **date-fns** | Date formatting and manipulation |
| 📦 | **Bun** | Fast package manager & runtime |

---

## 🚀 Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed globally
- A [Supabase](https://supabase.com) project

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/JessieJunatas/CAV-RHS.git
cd CAV-RHS

# 2. Install dependencies
bun install

# 3. Set up environment variables
cp .env.example .env
```

Add your Supabase credentials to `.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

Run this in your **Supabase SQL Editor** to configure RLS policies for all authenticated staff:

```sql
-- Drop any old restrictive policies
DROP POLICY IF EXISTS "Allow authenticated insert" ON public.cav_forms;
DROP POLICY IF EXISTS "Allow users to view own forms" ON public.cav_forms;
DROP POLICY IF EXISTS "Delete" ON public.cav_forms;
DROP POLICY IF EXISTS "Users can update their own records" ON public.cav_forms;

-- Open policies for all authenticated users
CREATE POLICY "select_all" ON public.cav_forms
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "insert_all" ON public.cav_forms
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "update_all" ON public.cav_forms
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "delete_all" ON public.cav_forms
  FOR DELETE TO authenticated USING (true);
```

### Run Locally

```bash
bun run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/                    # shadcn/ui + custom components
│   │   └── date-picker.tsx    # Themed calendar date picker
│   └── animate-ui/            # Animated button components
├── pages/
│   ├── Home.tsx               # Records dashboard
│   ├── CAV.tsx                # CAV form + live PDF preview
│   ├── EditPage.tsx           # Edit existing record
│   ├── ViewPage.tsx           # Read-only record view
│   ├── ArchivePage.tsx        # Archived records + bulk actions
│   └── About.tsx              # About the system
├── utils/
│   ├── generateCAVpdf.ts      # PDF generation & download
│   ├── generateCAVpreview.ts  # PDF blob URL for iframe preview
│   └── audit-log.ts           # Audit logging utility
├── lib/
│   └── supabase.ts            # Supabase client
└── CRUD.ts                    # Shared Supabase CRUD helpers
```

---

## 📜 CAV Template

Place the official 4-page CAV PDF template at:

```
public/CAV_Template.pdf
```

The system fills in the following fields across all 4 pages:

| Page | Fields Filled |
|---|---|
| Page 1 | Full name (×2 placements), date sentence |
| Page 2 | Full name, date of application |
| Page 3 | Control no., full name, date of application, date of transmission |
| Page 4 | Full name, school name, address, year completed, year graduated, date sentence |

---

## 👥 Authors

Built with ❤️ by **Rex** and **Jessie** for Rizal High School's Registrar's Office.

---

<div align="center">

*Rizal High School — City of Pasig*

</div>