#!/usr/bin/env python3
"""
Script para migrar invoices de DB1 → DB2
Preserva la relación: edificio → año → mes → invoice

Uso: python migrate_invoices_db.py
"""

import sqlite3
import sys
from pathlib import Path
from datetime import datetime

# Rutas
DB1_PATH = Path(__file__).parent.parent / "edificios.db"  # Desktop/edificios.db
DB2_PATH = Path(__file__).parent / "edificios.db"         # ProyectoPalo/edificios.db

class InvoiceMigrator:
    def __init__(self, db1_path, db2_path):
        self.db1_path = db1_path
        self.db2_path = db2_path
        self.conn1 = None
        self.conn2 = None
        self.stats = {
            "buildings_checked": 0,
            "years_checked": 0,
            "months_checked": 0,
            "invoices_migrated": 0,
            "invoices_skipped": 0,
            "errors": []
        }

    def connect(self):
        """Conectar a ambas bases de datos"""
        try:
            self.conn1 = sqlite3.connect(self.db1_path)
            self.conn1.row_factory = sqlite3.Row
            print(f"✓ Conectado a DB1: {self.db1_path}")
        except Exception as e:
            print(f"❌ Error conectando DB1: {e}")
            sys.exit(1)

        try:
            self.conn2 = sqlite3.connect(self.db2_path)
            self.conn2.row_factory = sqlite3.Row
            print(f"✓ Conectado a DB2: {self.db2_path}")
        except Exception as e:
            print(f"❌ Error conectando DB2: {e}")
            sys.exit(1)

    def verify_schemas(self):
        """Verificar que ambas BDs tengan la estructura correcta"""
        cursor1 = self.conn1.cursor()
        cursor2 = self.conn2.cursor()

        # Tablas requeridas
        required_tables = ["buildings", "years", "months", "invoices"]
        
        for table in required_tables:
            cursor1.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
            if not cursor1.fetchone():
                print(f"❌ DB1 no tiene tabla '{table}'")
                sys.exit(1)

            cursor2.execute(f"SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
            if not cursor2.fetchone():
                print(f"❌ DB2 no tiene tabla '{table}'")
                sys.exit(1)

        print("✓ Esquemas verificados correctamente")

    def get_or_create_building(self, building_name, building_address):
        """Obtiene o crea un edificio en DB2"""
        cursor = self.conn2.cursor()
        
        # Buscar por nombre exacto
        cursor.execute(
            "SELECT id FROM buildings WHERE nombre = ? AND direccion = ?",
            (building_name, building_address)
        )
        result = cursor.fetchone()
        if result:
            return result[0]

        # Crear nuevo
        cursor.execute(
            "INSERT INTO buildings (nombre, direccion) VALUES (?, ?)",
            (building_name, building_address)
        )
        self.conn2.commit()
        return cursor.lastrowid

    def get_or_create_year(self, building_id, year):
        """Obtiene o crea un año en DB2"""
        cursor = self.conn2.cursor()
        
        cursor.execute(
            "SELECT id FROM years WHERE building_id = ? AND year = ?",
            (building_id, year)
        )
        result = cursor.fetchone()
        if result:
            return result[0]

        # Crear nuevo
        cursor.execute(
            "INSERT INTO years (building_id, year) VALUES (?, ?)",
            (building_id, year)
        )
        self.conn2.commit()
        return cursor.lastrowid

    def get_or_create_month(self, year_id, month_name, month_code):
        """Obtiene o crea un mes en DB2"""
        cursor = self.conn2.cursor()
        
        cursor.execute(
            "SELECT id FROM months WHERE year_id = ? AND mes = ?",
            (year_id, month_name)
        )
        result = cursor.fetchone()
        if result:
            return result[0]

        # Crear nuevo
        cursor.execute(
            "INSERT INTO months (year_id, mes, codigo) VALUES (?, ?, ?)",
            (year_id, month_name, month_code)
        )
        self.conn2.commit()
        return cursor.lastrowid

    def invoice_exists_in_db2(self, month_id, file_path):
        """Verifica si una invoice ya existe en DB2"""
        cursor = self.conn2.cursor()
        cursor.execute(
            "SELECT id FROM invoices WHERE month_id = ? AND file_path = ?",
            (month_id, file_path)
        )
        return cursor.fetchone() is not None

    def migrate(self):
        """Ejecuta la migración completa"""
        print("\n" + "="*60)
        print("INICIANDO MIGRACIÓN DE INVOICES")
        print("="*60 + "\n")

        try:
            cursor1 = self.conn1.cursor()

            # Obtener todos los edificios de DB1
            cursor1.execute("SELECT * FROM buildings")
            buildings = cursor1.fetchall()
            print(f"📦 {len(buildings)} edificios encontrados en DB1\n")

            for building in buildings:
                building_id = building[0]
                building_name = building[1]
                building_address = building[2]

                print(f"🏢 Procesando: {building_name}")
                self.stats["buildings_checked"] += 1

                # Obtener o crear edificio en DB2
                new_building_id = self.get_or_create_building(building_name, building_address)

                # Obtener años de este edificio
                cursor1.execute("SELECT * FROM years WHERE building_id = ?", (building_id,))
                years = cursor1.fetchall()

                for year in years:
                    year_id = year[0]
                    year_num = year[2]

                    print(f"  📅 Año: {year_num}")
                    self.stats["years_checked"] += 1

                    # Obtener o crear año en DB2
                    new_year_id = self.get_or_create_year(new_building_id, year_num)

                    # Obtener meses de este año
                    cursor1.execute("SELECT * FROM months WHERE year_id = ?", (year_id,))
                    months = cursor1.fetchall()

                    for month in months:
                        month_id = month[0]
                        month_name = month[2]
                        month_code = month[3]

                        print(f"     📆 Mes: {month_name}")
                        self.stats["months_checked"] += 1

                        # Obtener o crear mes en DB2
                        new_month_id = self.get_or_create_month(new_year_id, month_name, month_code)

                        # Obtener invoices de este mes
                        cursor1.execute("SELECT * FROM invoices WHERE month_id = ?", (month_id,))
                        invoices = cursor1.fetchall()

                        for invoice in invoices:
                            try:
                                invoice_id = invoice[0]
                                file_path = invoice[2]
                                fecha = invoice[3]
                                monto = invoice[4]
                                descripcion = invoice[5]

                                # Verificar que no exista
                                if self.invoice_exists_in_db2(new_month_id, file_path):
                                    self.stats["invoices_skipped"] += 1
                                    continue

                                # Insertar en DB2
                                cursor2 = self.conn2.cursor()
                                cursor2.execute(
                                    """INSERT INTO invoices 
                                       (month_id, file_path, fecha, monto, descripcion)
                                       VALUES (?, ?, ?, ?, ?)""",
                                    (new_month_id, file_path, fecha, monto, descripcion)
                                )
                                self.conn2.commit()
                                self.stats["invoices_migrated"] += 1

                            except Exception as e:
                                self.stats["errors"].append(f"Invoice {invoice_id}: {str(e)}")
                                print(f"        ❌ Error: {str(e)}")

            print("\n" + "="*60)
            print("RESUMEN DE MIGRACIÓN")
            print("="*60)
            print(f"✓ Edificios procesados: {self.stats['buildings_checked']}")
            print(f"✓ Años procesados: {self.stats['years_checked']}")
            print(f"✓ Meses procesados: {self.stats['months_checked']}")
            print(f"✓ Invoices migradas: {self.stats['invoices_migrated']}")
            print(f"⏭️  Invoices saltadas (duplicados): {self.stats['invoices_skipped']}")
            
            if self.stats["errors"]:
                print(f"\n⚠️  Errores encontrados: {len(self.stats['errors'])}")
                for error in self.stats["errors"]:
                    print(f"   - {error}")
            
            print("="*60 + "\n")

        except Exception as e:
            print(f"\n❌ Error durante la migración: {e}")
            self.conn2.rollback()
            sys.exit(1)

    def verify_results(self):
        """Verifica los resultados de la migración"""
        print("\n📊 VERIFICACIÓN DE RESULTADOS\n")
        
        cursor1 = self.conn1.cursor()
        cursor2 = self.conn2.cursor()

        # Conteo de tablas
        for table in ["buildings", "years", "months", "invoices"]:
            cursor1.execute(f"SELECT COUNT(*) FROM {table}")
            count1 = cursor1.fetchone()[0]

            cursor2.execute(f"SELECT COUNT(*) FROM {table}")
            count2 = cursor2.fetchone()[0]

            print(f"{table}:")
            print(f"  DB1: {count1} registros")
            print(f"  DB2: {count2} registros (puede haber más si ya existían)\n")

    def close(self):
        """Cierra las conexiones"""
        if self.conn1:
            self.conn1.close()
        if self.conn2:
            self.conn2.close()
        print("✓ Conexiones cerradas")

def main():
    if not DB1_PATH.exists():
        print(f"❌ No se encontró DB1 en: {DB1_PATH}")
        sys.exit(1)

    if not DB2_PATH.exists():
        print(f"❌ No se encontró DB2 en: {DB2_PATH}")
        sys.exit(1)

    migrator = InvoiceMigrator(DB1_PATH, DB2_PATH)
    
    try:
        migrator.connect()
        migrator.verify_schemas()
        migrator.migrate()
        migrator.verify_results()
    finally:
        migrator.close()

if __name__ == "__main__":
    main()
