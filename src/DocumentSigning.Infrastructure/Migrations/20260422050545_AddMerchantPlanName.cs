using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace DocumentSigning.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddMerchantPlanName : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PlanName",
                table: "Merchants",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PlanName",
                table: "Merchants");
        }
    }
}
