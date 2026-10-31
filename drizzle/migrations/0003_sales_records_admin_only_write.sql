DROP POLICY "records insert" ON public.sales_records;
DROP POLICY "records update" ON public.sales_records;
DROP POLICY "records delete" ON public.sales_records;

CREATE POLICY "records insert" ON public.sales_records
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "records update" ON public.sales_records
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "records delete" ON public.sales_records
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));