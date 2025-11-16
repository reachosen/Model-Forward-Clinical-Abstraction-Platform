#!/usr/bin/env python3
"""
CA Factory CLI Tool

Command-line interface for managing CA Factory projects.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Any

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from ca_factory.config.project_manager import ProjectManager
from ca_factory.config.loader import ConfigLoader
from ca_factory.config.validator import ConfigValidator


def init_project(args):
    """Initialize a new CA Factory project."""
    config_root = Path(args.config_root)
    pm = ProjectManager(config_root)

    print(f"Creating new project: {args.project_id}")
    print(f"Project name: {args.name}")
    print(f"Domain: {args.domain}")

    try:
        if args.template:
            print(f"Using template: {args.template}")
            manifest = pm.create_from_template(
                project_id=args.project_id,
                template=args.template,
                replacements={}
            )
        else:
            manifest = pm.create_project(
                project_id=args.project_id,
                project_name=args.name,
                domain=args.domain,
                description=args.description or "",
                template="default"
            )

        print("\n✓ Project created successfully!")
        print(f"Project directory: {config_root}/projects/{args.project_id}")
        print(f"\nManifest:")
        print(json.dumps(manifest, indent=2))

    except Exception as e:
        print(f"\n✗ Error creating project: {str(e)}", file=sys.stderr)
        sys.exit(1)


def list_projects(args):
    """List all available projects."""
    config_root = Path(args.config_root)
    pm = ProjectManager(config_root)

    projects = pm.list_projects()

    if not projects:
        print("No projects found.")
        return

    print(f"\nAvailable Projects ({len(projects)}):\n")
    for project in projects:
        manifest = project.get("project_manifest", {})
        print(f"  • {manifest.get('project_id', 'unknown')}")
        print(f"    Name: {manifest.get('project_name', 'N/A')}")
        print(f"    Domain: {manifest.get('domain', 'N/A')}")
        print(f"    Version: {manifest.get('version', 'N/A')}")
        print()


def validate_project(args):
    """Validate a project configuration."""
    config_root = Path(args.config_root)
    pm = ProjectManager(config_root)

    print(f"Validating project: {args.project_id}")

    try:
        result = pm.validate_project(args.project_id)

        if result["valid"]:
            print("\n✓ Project configuration is valid!")
        else:
            print("\n✗ Project configuration has errors:")
            for error in result["errors"]:
                print(f"  • {error}")

        if result.get("warnings"):
            print("\nWarnings:")
            for warning in result["warnings"]:
                print(f"  ⚠ {warning}")

        sys.exit(0 if result["valid"] else 1)

    except Exception as e:
        print(f"\n✗ Error validating project: {str(e)}", file=sys.stderr)
        sys.exit(1)


def show_project(args):
    """Show project details."""
    config_root = Path(args.config_root)
    pm = ProjectManager(config_root)

    print(f"Loading project: {args.project_id}")

    try:
        if args.manifest_only:
            config = pm.loader.load_manifest(args.project_id)
        else:
            config = pm.get_project(args.project_id)

        print(json.dumps(config, indent=2))

    except Exception as e:
        print(f"\n✗ Error loading project: {str(e)}", file=sys.stderr)
        sys.exit(1)


def delete_project(args):
    """Delete a project."""
    config_root = Path(args.config_root)
    pm = ProjectManager(config_root)

    if not args.confirm:
        print("Error: Must use --confirm flag to delete project", file=sys.stderr)
        sys.exit(1)

    print(f"Deleting project: {args.project_id}")

    # Ask for confirmation
    response = input(f"Are you sure you want to delete '{args.project_id}'? (yes/no): ")

    if response.lower() != "yes":
        print("Deletion cancelled.")
        return

    try:
        pm.delete_project(args.project_id, confirm=True)
        print("\n✓ Project deleted successfully!")

    except Exception as e:
        print(f"\n✗ Error deleting project: {str(e)}", file=sys.stderr)
        sys.exit(1)


def export_project(args):
    """Export a project."""
    config_root = Path(args.config_root)
    pm = ProjectManager(config_root)
    output_path = Path(args.output)

    print(f"Exporting project: {args.project_id}")
    print(f"Output directory: {output_path}")

    try:
        pm.export_project(args.project_id, output_path)
        print("\n✓ Project exported successfully!")

    except Exception as e:
        print(f"\n✗ Error exporting project: {str(e)}", file=sys.stderr)
        sys.exit(1)


def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="CA Factory CLI - Manage CA Factory projects",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create a new project
  ca-factory init cauti --name "CAUTI Detection" --domain "HAC"

  # Create from template
  ca-factory init ssi --template hac_template --name "SSI Detection"

  # List all projects
  ca-factory list

  # Validate a project
  ca-factory validate clabsi

  # Show project details
  ca-factory show clabsi

  # Delete a project
  ca-factory delete test_project --confirm

  # Export a project
  ca-factory export clabsi --output ./exports
        """
    )

    parser.add_argument(
        "--config-root",
        default="./backend/configs",
        help="Root directory for configurations (default: ./backend/configs)"
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # Init command
    init_parser = subparsers.add_parser("init", help="Initialize a new project")
    init_parser.add_argument("project_id", help="Project identifier (e.g., 'cauti')")
    init_parser.add_argument("--name", required=True, help="Project name")
    init_parser.add_argument("--domain", required=True, help="Domain name")
    init_parser.add_argument("--description", help="Project description")
    init_parser.add_argument("--template", help="Template to use")
    init_parser.set_defaults(func=init_project)

    # List command
    list_parser = subparsers.add_parser("list", help="List all projects")
    list_parser.set_defaults(func=list_projects)

    # Validate command
    validate_parser = subparsers.add_parser("validate", help="Validate a project")
    validate_parser.add_argument("project_id", help="Project identifier")
    validate_parser.set_defaults(func=validate_project)

    # Show command
    show_parser = subparsers.add_parser("show", help="Show project details")
    show_parser.add_argument("project_id", help="Project identifier")
    show_parser.add_argument("--manifest-only", action="store_true", help="Show only manifest")
    show_parser.set_defaults(func=show_project)

    # Delete command
    delete_parser = subparsers.add_parser("delete", help="Delete a project")
    delete_parser.add_argument("project_id", help="Project identifier")
    delete_parser.add_argument("--confirm", action="store_true", help="Confirm deletion")
    delete_parser.set_defaults(func=delete_project)

    # Export command
    export_parser = subparsers.add_parser("export", help="Export a project")
    export_parser.add_argument("project_id", help="Project identifier")
    export_parser.add_argument("--output", required=True, help="Output directory")
    export_parser.set_defaults(func=export_project)

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    args.func(args)


if __name__ == "__main__":
    main()
